import { Injectable } from '@nestjs/common';
import { Invoice } from '../billing/entities/invoice.entity';
import { Clinic } from '../clinics/entities/clinic.entity';

@Injectable()
export class PdfService {
  async generateInvoicePdf(invoice: Invoice, clinic: Clinic): Promise<Buffer> {
    const html = this.buildInvoiceHtml(invoice, clinic);

    // Try html-pdf-node first
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const htmlPdf = require('html-pdf-node');
      const file = { content: html };
      const options = {
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
      };
      const buf: Buffer = await new Promise((res, rej) =>
        htmlPdf.generatePdf(file, options, (err: Error, buf: Buffer) =>
          err ? rej(err) : res(buf),
        ),
      );
      return buf;
    } catch {}

    // Try puppeteer
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buf = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      return Buffer.from(buf);
    } catch {}

    // Final fallback: return HTML buffer (client detects via content-type)
    return Buffer.from(html, 'utf-8');
  }

  buildInvoiceHtml(invoice: Invoice, clinic: Clinic): string {
    const fmtDate = (d: any) =>
      d
        ? new Date(d).toLocaleDateString('en', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '—';
    const fmtNPR = (n: number | string) =>
      `NPR ${Number(n).toLocaleString('en')}`;

    const rows = (invoice.items || [])
      .map(
        (item: any) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb">${item.description}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${fmtNPR(item.unitPrice)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${fmtNPR(item.total)}</td>
      </tr>`,
      )
      .join('');

    const tpl = clinic.billingTemplate || {};
    const themeColor    = tpl.themeColor || '#027cc6';
    // Default OFF (only show if explicitly enabled in template)
    const showLogo      = tpl.showLogo    === true;
    const showVat       = tpl.showVatNumber       === true;
    const showReg       = tpl.showRegistrationNumber === true;
    const showLicense   = tpl.showLicenseNumber   === true;

    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
    const logoHtml = showLogo && clinic?.logo
      ? `<img src="${clinic.logo.startsWith('http') ? clinic.logo : `${API_BASE}${clinic.logo}`}" alt="logo" style="max-height:56px;max-width:160px;object-fit:contain;display:block;margin-bottom:6px" />`
      : '';

    const clinicMeta = [
      clinic?.address,
      clinic?.phone,
      clinic?.email,
      showLicense && clinic?.licenseNumber      ? `License: ${clinic.licenseNumber}`             : null,
      showReg     && clinic?.registrationNumber  ? `Reg No: ${clinic.registrationNumber}`          : null,
      showVat     && clinic?.vatNumber           ? `VAT No: ${clinic.vatNumber}`                   : null,
    ]
      .filter(Boolean)
      .join('<br>');

    const headerNote = tpl.headerNote ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;font-style:italic">${tpl.headerNote}</div>` : '';
    const footerNote = tpl.footerNote ? `<p style="margin-top:20px;text-align:center;font-size:11px;color:#9ca3af;font-style:italic">${tpl.footerNote}</p>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1f2937; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 36px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; border-bottom: 3px solid ${themeColor}; padding-bottom: 20px; }
  .brand { font-size: 26px; font-weight: 800; color: ${themeColor}; }
  .clinic-info { text-align: right; font-size: 12px; color: #6b7280; line-height: 1.7; }
  .clinic-name { font-size: 15px; font-weight: 700; color: #1f2937; }
  .invoice-title { font-size: 22px; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
  .invoice-meta { color: #6b7280; font-size: 12px; line-height: 1.8; }
  .parties { display: flex; gap: 24px; margin-bottom: 28px; }
  .party { flex: 1; padding: 14px 16px; background: #f9fafb; border-radius: 8px; border-left: 3px solid ${themeColor}; }
  .party h4 { font-size: 9px; text-transform: uppercase; letter-spacing: .1em; color: #9ca3af; margin-bottom: 6px; }
  .party p { font-size: 13px; color: #1f2937; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: ${themeColor}; color: #fff; }
  thead th { padding: 11px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  thead th:nth-child(2) { text-align: center; }
  thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .totals table td { padding: 6px 8px; font-size: 13px; }
  .totals .grand { background: ${themeColor}; color: #fff; font-size: 15px; font-weight: 700; border-radius: 6px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .paid   { background: #d1fae5; color: #065f46; }
  .unpaid { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
  .reg-info { display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; color: #6b7280; margin-top: 6px; }
  .reg-info span { padding: 2px 8px; background: #f3f4f6; border-radius: 4px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      // <div class="brand">🦷 DentalOS</div>
      <div style="margin-top:10px">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-meta">
          <div><strong>#${invoice.invoiceNumber}</strong></div>
          <div>Issued: ${fmtDate(invoice.createdAt)}</div>
          ${invoice.dueDate ? `<div>Due: ${fmtDate(invoice.dueDate)}</div>` : ''}
          <div style="margin-top:6px">
            <span class="status-badge ${invoice.status === 'paid' ? 'paid' : 'unpaid'}">${invoice.status.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="clinic-info">
      ${logoHtml}
      <div class="clinic-name">${clinic?.name || 'Dental Clinic'}</div>
      <div style="margin-top:4px">${clinicMeta}</div>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h4>Billed To</h4>
      <p>
        <strong>${invoice.patient?.firstName || ''} ${invoice.patient?.lastName || ''}</strong><br>
        ${invoice.patient?.phone ? invoice.patient.phone + '<br>' : ''}
        ${invoice.patient?.email || ''}
      </p>
    </div>
    <div class="party">
      <h4>Payment Info</h4>
      <p>
        ${invoice.paymentMethod ? `Method: ${String(invoice.paymentMethod).replace('_', ' ')}` : 'Payment pending'}<br>
        ${invoice.paidAt ? `Paid: ${fmtDate(invoice.paidAt)}` : ''}
        ${(invoice as any).paymentTransactionId ? `<br>Txn: ${(invoice as any).paymentTransactionId}` : ''}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Unit Price</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td style="text-align:right">${fmtNPR(invoice.subtotal)}</td></tr>
      ${Number(invoice.taxAmount) > 0 ? `<tr><td>VAT (${invoice.taxPercent}%)</td><td style="text-align:right">${fmtNPR(invoice.taxAmount)}</td></tr>` : ''}
      ${Number(invoice.discountAmount) > 0 ? `<tr><td>Discount</td><td style="text-align:right">- ${fmtNPR(invoice.discountAmount)}</td></tr>` : ''}
      <tr class="grand"><td>Total</td><td style="text-align:right">${fmtNPR(invoice.total)}</td></tr>
      ${Number(invoice.paidAmount) > 0 ? `<tr><td style="color:#6b7280">Paid</td><td style="text-align:right;color:#6b7280">${fmtNPR(invoice.paidAmount)}</td></tr>` : ''}
      ${Number(invoice.dueAmount) > 0 ? `<tr><td style="color:#dc2626;font-weight:700">Balance Due</td><td style="text-align:right;color:#dc2626;font-weight:700">${fmtNPR(invoice.dueAmount)}</td></tr>` : ''}
    </table>
  </div>

  ${invoice.notes ? `<div style="margin-top:28px;padding:14px 16px;background:#f9fafb;border-radius:8px;border-left:3px solid #d1d5db;font-size:12px;color:#6b7280"><strong style="color:#374151">Notes:</strong> ${invoice.notes}</div>` : ''}

  ${footerNote}
  <div class="footer">
    Generated by DentalOS &bull; ${new Date().getFullYear()}
    ${showVat && clinic?.vatNumber           ? `&bull; VAT: ${clinic.vatNumber}`             : ''}
    ${showReg && clinic?.registrationNumber  ? `&bull; Reg: ${clinic.registrationNumber}`    : ''}
  </div>
</div>
</body>
</html>`;
  }
}