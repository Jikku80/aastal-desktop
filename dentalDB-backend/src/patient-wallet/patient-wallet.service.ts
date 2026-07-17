import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PatientWallet } from './entities/patient-wallet.entity';
import { WalletTransaction, WalletTxType, WalletTxRefType } from './entities/wallet-transaction.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Invoice, InvoiceStatus, PaymentMethod } from '../billing/entities/invoice.entity';

@Injectable()
export class PatientWalletService {
  constructor(
    @InjectRepository(PatientWallet)   private walletRepo: Repository<PatientWallet>,
    @InjectRepository(WalletTransaction) private txRepo: Repository<WalletTransaction>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
    private auditService: AuditService,
    private notificationsGateway: NotificationsGateway,
  ) {}

  async getOrCreate(clinicId: string, patientId: string): Promise<PatientWallet> {
    let wallet = await this.walletRepo.findOne({ where: { clinicId, patientId } });
    if (!wallet) {
      wallet = await this.walletRepo.save(this.walletRepo.create({ clinicId, patientId }));
    }
    return wallet;
  }

  async getBalance(clinicId: string, patientId: string) {
    const wallet = await this.getOrCreate(clinicId, patientId);
    return { balance: Number(wallet.balance), currency: wallet.currency, walletId: wallet.id };
  }

  async credit(
    clinicId: string, patientId: string, amount: number,
    description: string, createdBy: string, referenceId?: string,
  ): Promise<WalletTransaction> {
    if (!(Number(amount) > 0)) {
      throw new BadRequestException('Credit amount must be greater than zero');
    }
    const wallet = await this.getOrCreate(clinicId, patientId);
    const before = Number(wallet.balance);
    wallet.balance = Number((before + Number(amount)).toFixed(2));
    await this.walletRepo.save(wallet);
    const tx = await this.txRepo.save(this.txRepo.create({
      clinicId, walletId: wallet.id, patientId,
      type: WalletTxType.CREDIT, amount, balanceBefore: before,
      balanceAfter: wallet.balance, description,
      referenceType: referenceId ? WalletTxRefType.INVOICE : WalletTxRefType.MANUAL,
      referenceId, createdBy,
    }));
    await this.auditService.log({
      clinicId, userId: createdBy, action: AuditAction.CREATED,
      entityType: AuditEntityType.WALLET, entityId: wallet.id,
      changes: { after: { type: 'credit', amount } },
    });
    this.notificationsGateway.server?.to(clinicId).emit('wallet:credit', { patientId, amount });
    return tx;
  }

  async debit(
    clinicId: string, patientId: string, amount: number,
    description: string, createdBy: string, referenceId?: string,
  ): Promise<WalletTransaction> {
    // Guards against callers (like the invoice quick-apply button) computing
    // an amount of 0 or less and getting back a silent "success" — a 0-amount
    // debit used to write a real transaction row and report success without
    // ever moving money, which is exactly what looked like "nothing got
    // deducted" from the patient wallet.
    if (!(Number(amount) > 0)) {
      throw new BadRequestException('Debit amount must be greater than zero');
    }
    const wallet = await this.getOrCreate(clinicId, patientId);
    const before = Number(wallet.balance);
    if (before < Number(amount)) throw new BadRequestException('Insufficient wallet balance');
    wallet.balance = Number((before - Number(amount)).toFixed(2));
    await this.walletRepo.save(wallet);
    const tx = await this.txRepo.save(this.txRepo.create({
      clinicId, walletId: wallet.id, patientId,
      type: WalletTxType.DEBIT, amount, balanceBefore: before,
      balanceAfter: wallet.balance, description,
      referenceType: referenceId ? WalletTxRefType.INVOICE : WalletTxRefType.MANUAL,
      referenceId, createdBy,
    }));
    await this.auditService.log({
      clinicId, userId: createdBy, action: AuditAction.UPDATED,
      entityType: AuditEntityType.WALLET, entityId: wallet.id,
      changes: { after: { type: 'debit', amount } },
    });
    return tx;
  }

  async getTransactions(clinicId: string, patientId: string, params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const [data, total] = await this.txRepo.findAndCount({
      where: { clinicId, patientId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit, take: limit,
    });
    return { data, total };
  }

  async applyToInvoice(clinicId: string, patientId: string, invoiceId: string, amount: number, userId: string) {
    // First debit the wallet
    const tx = await this.debit(clinicId, patientId, amount, `Payment for invoice ${invoiceId}`, userId, invoiceId);

    // Then update the invoice paid/due amounts
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId, clinicId } });
    if (invoice) {
      const newPaid = Number(invoice.paidAmount || 0) + Number(amount);
      const newDue  = Math.max(0, Number(invoice.total) - newPaid);
      const newStatus = newDue <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
      await this.invoiceRepo.update({ id: invoiceId, clinicId }, {
        paidAmount: newPaid,
        dueAmount:  newDue,
        status:     newStatus,
        paymentMethod: PaymentMethod.WALLET_DEBIT,
        paidAt: newDue <= 0 ? new Date() : invoice.paidAt,
      });
    }
    return tx;
  }
}