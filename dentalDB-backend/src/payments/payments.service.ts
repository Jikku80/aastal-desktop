import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { Invoice, InvoiceStatus, PaymentMethod } from '../billing/entities/invoice.entity';

@Injectable()
export class PaymentsService {
  constructor(
    private config: ConfigService,
    private http: HttpService,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
  ) {}

  // ─── eSewa ────────────────────────────────────────────────────────────────
  async initEsewa(clinicId: string, dto: {
    invoiceId?: string; amount: number;
    purpose: string; planId?: string; billingCycle?: string;
  }) {
    // For subscription payments, skip invoice lookup
    if (dto.purpose === 'subscription') {
      return this._initEsewaSubscription(clinicId, dto);
    }
    const invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoiceId!, clinicId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const merchantId = this.config.get('ESEWA_MERCHANT_CODE', this.config.get('ESEWA_MERCHANT_ID',));
    const baseUrl = this.config.get('ESEWA_URL', this.config.get('ESEWA_BASE_URL',));
    const successUrl = `${this.config.get('FRONTEND_URL')}/payments/esewa/success`;
    const failureUrl = `${this.config.get('FRONTEND_URL')}/payments/esewa/failure`;
    const transactionUuid = `${invoice.id}-${Date.now()}`;

    // Generate HMAC signature (production requirement)
    const secretKey = this.config.get('ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q');
    const message = `total_amount=${dto.amount},transaction_uuid=${transactionUuid},product_code=${merchantId}`;
    const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64');

    const params = {
      amount: dto.amount,
      tax_amount: 0,
      total_amount: dto.amount,
      transaction_uuid: transactionUuid,
      product_code: merchantId,
      product_service_charge: 0,
      product_delivery_charge: 0,
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    };

    return {
      formUrl: baseUrl,
      params,
      transactionUuid,
    };
  }

  async verifyEsewa(clinicId: string, dto: { invoiceId: string; data: string }) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoiceId, clinicId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const baseUrl = this.config.get('ESEWA_URL', this.config.get('ESEWA_BASE_URL'));

    try {
      // Decode the base64 response from eSewa
      const decoded = JSON.parse(Buffer.from(dto.data, 'base64').toString('utf-8'));

      if (decoded.status !== 'COMPLETE') {
        throw new BadRequestException('eSewa payment not completed');
      }

      // Verify signature
      const secretKey = this.config.get('ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q');
      const message = decoded.signed_field_names
        .split(',')
        .map((field: string) => `${field}=${decoded[field]}`)
        .join(',');
      const expectedSig = crypto.createHmac('sha256', secretKey).update(message).digest('base64');

      if (decoded.signature !== expectedSig) {
        throw new BadRequestException('eSewa signature verification failed');
      }

      // Mark invoice as paid
      await this.markInvoicePaid(invoice, PaymentMethod.ESEWA, decoded.transaction_code, Number(decoded.total_amount));

      return { success: true, transactionId: decoded.transaction_code };
    } catch (e) {
      throw new BadRequestException('eSewa verification failed: ');
    }
  }

  // ─── Khalti ───────────────────────────────────────────────────────────────
  async initKhalti(clinicId: string, dto: {
    invoiceId?: string; amount: number;
    purpose?: string; planId?: string; billingCycle?: string; productName?: string; numBranches?: number;
  }) {
    const baseUrl = this.config.get('KHALTI_BASE_URL', 'https://dev.khalti.com');
    const secretKey = this.config.get('KHALTI_SECRET_KEY');
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    let returnUrl: string;
    let purchaseOrderId: string;
    let purchaseOrderName: string;
    let customerName: string;

    if (dto.purpose === 'subscription') {
      // Subscription payment
      returnUrl = `${frontendUrl}/dashboard/settings?tab=Subscription&payment=success&plan=${dto.planId || ''}&cycle=${dto.billingCycle || 'monthly'}&branches=${(dto as any).numBranches ?? 1}`;
      purchaseOrderId = `sub-${clinicId}-${Date.now()}`;
      purchaseOrderName = dto.productName || `DentalOS ${dto.planId || ''} Plan`;
      customerName = 'Clinic Owner';
    } else {
      const invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoiceId!, clinicId } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      returnUrl = `${frontendUrl}/payments/khalti/success`;
      purchaseOrderId = invoice.id;
      purchaseOrderName = `Invoice ${invoice.invoiceNumber}`;
      customerName = `${invoice.patient?.firstName || ''} ${invoice.patient?.lastName || ''}`.trim();
    }

    const payload = {
      return_url: returnUrl,
      website_url: frontendUrl,
      amount: dto.amount, // Already in paisa from frontend
      purchase_order_id: purchaseOrderId,
      purchase_order_name: purchaseOrderName,
      customer_info: { name: customerName },
    };

    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/api/v2/epayment/initiate/`, payload, {
        headers: { Authorization: `Key ${secretKey}` },
      }),
    );

    return { payment_url: data.payment_url, pidx: data.pidx };
  }

  async verifyKhalti(clinicId: string, dto: { invoiceId: string; pidx: string }) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoiceId, clinicId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const baseUrl = this.config.get('KHALTI_BASE_URL', 'https://dev.khalti.com');
    const secretKey = this.config.get('KHALTI_SECRET_KEY');

    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/api/v2/epayment/lookup/`, { pidx: dto.pidx }, {
        headers: { Authorization: `Key ${secretKey}` },
      }),
    );

    if (data.status !== 'Completed') {
      throw new BadRequestException('Khalti payment not completed');
    }

    await this.markInvoicePaid(invoice, PaymentMethod.KHALTI, data.transaction_id, data.total_amount / 100);
    return { success: true, transactionId: data.transaction_id };
  }

  // ─── PayPal ───────────────────────────────────────────────────────────────
  private async getPaypalAccessToken(): Promise<string> {
    const clientId = this.config.get('PAYPAL_CLIENT_ID');
    const clientSecret = this.config.get('PAYPAL_CLIENT_SECRET');
    const baseUrl = this.config.get('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com');

    const { data } = await firstValueFrom(
      this.http.post(`${baseUrl}/v1/oauth2/token`, 'grant_type=client_credentials', {
        auth: { username: clientId, password: clientSecret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );
    return data.access_token;
  }

  async createPaypalOrder(clinicId: string, dto: { invoiceId: string; amount: number; currency?: string }) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: dto.invoiceId, clinicId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const accessToken = await this.getPaypalAccessToken();
    const baseUrl = this.config.get('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com');

    const { data } = await firstValueFrom(
      this.http.post(
        `${baseUrl}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: invoice.id,
            description: `Invoice ${invoice.invoiceNumber}`,
            amount: {
              currency_code: dto.currency || 'USD',
              value: dto.amount.toFixed(2),
            },
          }],
          application_context: {
            return_url: `${this.config.get('FRONTEND_URL')}/payments/paypal/success`,
            cancel_url: `${this.config.get('FRONTEND_URL')}/payments/paypal/cancel`,
          },
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
      ),
    );

    const approveLink = data.links.find((l: any) => l.rel === 'approve');
    return { orderId: data.id, approveUrl: approveLink?.href };
  }

  async capturePaypalOrder(clinicId: string, orderId: string, invoiceId: string) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId, clinicId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const accessToken = await this.getPaypalAccessToken();
    const baseUrl = this.config.get('PAYPAL_BASE_URL', 'https://api-m.sandbox.paypal.com');

    const { data } = await firstValueFrom(
      this.http.post(
        `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
      ),
    );

    if (data.status !== 'COMPLETED') {
      throw new BadRequestException('PayPal capture failed');
    }

    const capturedAmount = parseFloat(data.purchase_units[0].payments.captures[0].amount.value);
    await this.markInvoicePaid(invoice, PaymentMethod.PAYPAL, data.id, capturedAmount);
    return { success: true, orderId: data.id };
  }

  // ─── Shared ───────────────────────────────────────────────────────────────
  private async markInvoicePaid(invoice: Invoice, method: PaymentMethod, transactionId: string, amount: number) {
    const paid = Number(invoice.paidAmount) + amount;
    const due = Number(invoice.total) - paid;
    invoice.paidAmount = paid;
    invoice.dueAmount = Math.max(due, 0);
    invoice.paymentMethod = method;
    invoice.paymentTransactionId = transactionId;
    invoice.paidAt = new Date();
    invoice.status = due <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
    await this.invoiceRepo.save(invoice);
  }
  // ─── Subscription payments ────────────────────────────────────────────────
  private async _initEsewaSubscription(clinicId: string, dto: {
    amount: number; purpose: string; planId?: string; billingCycle?: string; numBranches?: number;
  }) {
    const merchantId = this.config.get('ESEWA_MERCHANT_CODE', this.config.get('ESEWA_MERCHANT_ID'));
    const baseUrl = this.config.get('ESEWA_URL', this.config.get('ESEWA_BASE_URL'));
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const successUrl = `${frontendUrl}/dashboard/settings?tab=Subscription&payment=success&plan=${dto.planId || ''}&cycle=${dto.billingCycle || 'monthly'}&branches=${dto.numBranches ?? 1}`;
    const failureUrl = `${frontendUrl}/dashboard/settings?tab=Subscription&payment=failed`;
    const transactionUuid = `sub-${clinicId}-${Date.now()}`;

    const secretKey = this.config.get('ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q');
    const message = `total_amount=${dto.amount},transaction_uuid=${transactionUuid},product_code=${merchantId}`;
    const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64');

    return {
      formUrl: baseUrl,
      params: {
        amount: dto.amount,
        tax_amount: 0,
        total_amount: dto.amount,
        transaction_uuid: transactionUuid,
        product_code: merchantId,
        product_service_charge: 0,
        product_delivery_charge: 0,
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
      },
      transactionUuid,
    };
  }


}