import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from '../clinics/entities/clinic.entity';
import { renderPdfDoc, fetchImageAsDataUri, PDF_COLORS } from '../common/pdf/pdf-printer.util';
import { StatementsService } from './statements.service';

/**
 * Phase 9 §4 / Phase 8 integration — renders Balance Sheet, P&L, and Trial
 * Balance through the same pdfmake pipeline as every other PDF in the app,
 * reading `clinic.financialStatementTemplate` the same way
 * generateInvoicePdf reads `clinic.billingTemplate` (Phase 8's read
 * pattern, extended here rather than re-invented).
 */
@Injectable()
export class FinancePdfService {
  constructor(
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
    private statementsService: StatementsService,
  ) {}

  async getTemplate(clinicId: string): Promise<Record<string, any>> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic.financialStatementTemplate || {};
  }

  async saveTemplate(clinicId: string, patch: Record<string, any>): Promise<Record<string, any>> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    const merged = { ...(clinic.financialStatementTemplate || {}), ...patch };
    await this.clinicRepo.update(clinicId, { financialStatementTemplate: merged });
    return merged;
  }

  private async header(clinic: Clinic, title: string) {
    const tpl = clinic.financialStatementTemplate || {};
    const themeColor = tpl.themeColor || '#027cc6';
    const showLogo = tpl.showLogo === true;
    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
    let logoDataUri: string | null = null;
    if (showLogo && clinic.logo) {
      const logoUrl = clinic.logo.startsWith('http') ? clinic.logo : `${API_BASE}${clinic.logo}`;
      logoDataUri = await fetchImageAsDataUri(logoUrl);
    }
    const metaLines = [clinic.address, clinic.phone, clinic.email].filter(Boolean).join('  •  ');
    const content: any[] = [];
    if (logoDataUri) content.push({ image: logoDataUri, width: 60, margin: [0, 0, 0, 8] });
    content.push({ text: clinic.name, fontSize: 16, bold: true, color: themeColor });
    if (metaLines) content.push({ text: metaLines, fontSize: 8, color: PDF_COLORS.mutedText, margin: [0, 2, 0, 0] });
    content.push({ text: title, fontSize: 13, bold: true, margin: [0, 14, 0, 10], color: PDF_COLORS.darkText });
    return { content, themeColor };
  }

  private footer(clinic: Clinic) {
    const tpl = clinic.financialStatementTemplate || {};
    const note = tpl.footerNote ? ` • ${tpl.footerNote}` : '';
    return {
      text: `Generated ${new Date().toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}${note}`,
      fontSize: 7, color: PDF_COLORS.lightText, margin: [0, 16, 0, 0] as [number, number, number, number],
    };
  }

  private money(n: number): string {
    const v = Number(n || 0);
    return v < 0 ? `(${Math.abs(v).toLocaleString()})` : v.toLocaleString();
  }

  private twoColTable(rows: { label: string; value: string; bold?: boolean }[], themeColor: string) {
    return {
      table: {
        widths: ['*', 100],
        body: rows.map(r => [
          { text: r.label, bold: !!r.bold, fontSize: r.bold ? 10 : 9 },
          { text: r.value, bold: !!r.bold, fontSize: r.bold ? 10 : 9, alignment: 'right' },
        ]),
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => PDF_COLORS.border,
      },
      margin: [0, 0, 0, 14] as [number, number, number, number],
    };
  }

  async generateBalanceSheetPdf(clinicId: string, asOfDate?: string, branchId?: string): Promise<Buffer> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    const bs = await this.statementsService.getBalanceSheet(clinicId, { asOfDate, branchId });
    const { content, themeColor } = await this.header(clinic, `Balance Sheet — as of ${bs.asOfDate}`);

    content.push({ text: 'Assets', bold: true, fontSize: 11, color: themeColor, margin: [0, 4, 0, 6] });
    content.push(this.twoColTable([
      ...bs.assets.map(a => ({ label: `${a.code} — ${a.name}`, value: this.money(a.balance) })),
      { label: 'Total Assets', value: this.money(bs.totalAssets), bold: true },
    ], themeColor));

    content.push({ text: 'Liabilities', bold: true, fontSize: 11, color: themeColor, margin: [0, 4, 0, 6] });
    content.push(this.twoColTable([
      ...bs.liabilities.map(a => ({ label: `${a.code} — ${a.name}`, value: this.money(a.balance) })),
      { label: 'Total Liabilities', value: this.money(bs.totalLiabilities), bold: true },
    ], themeColor));

    content.push({ text: 'Equity', bold: true, fontSize: 11, color: themeColor, margin: [0, 4, 0, 6] });
    content.push(this.twoColTable([
      ...bs.equity.map(a => ({ label: `${a.code} — ${a.name}`, value: this.money(a.balance) })),
      { label: 'Net Income (current period, unclosed)', value: this.money(bs.netIncomeToDate) },
      { label: 'Total Equity', value: this.money(bs.totalEquity), bold: true },
    ], themeColor));

    content.push(this.twoColTable([
      { label: 'Total Liabilities + Equity', value: this.money(bs.totalLiabilities + bs.totalEquity), bold: true },
    ], themeColor));

    content.push(this.footer(clinic));
    return renderPdfDoc({ content, pageMargins: [40, 40, 40, 40] });
  }

  async generateProfitLossPdf(clinicId: string, dateFrom: string, dateTo: string, branchId?: string): Promise<Buffer> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    const pl = await this.statementsService.getProfitAndLoss(clinicId, { dateFrom, dateTo, branchId });
    const { content, themeColor } = await this.header(clinic, `Profit & Loss — ${dateFrom} to ${dateTo}`);

    content.push({ text: 'Revenue', bold: true, fontSize: 11, color: themeColor, margin: [0, 4, 0, 6] });
    content.push(this.twoColTable([
      ...pl.revenue.map(a => ({ label: `${a.code} — ${a.name}`, value: this.money(a.balance) })),
      { label: 'Total Revenue', value: this.money(pl.totalRevenue), bold: true },
    ], themeColor));

    content.push({ text: 'Expenses', bold: true, fontSize: 11, color: themeColor, margin: [0, 4, 0, 6] });
    content.push(this.twoColTable([
      ...pl.expenses.map(a => ({ label: `${a.code} — ${a.name}`, value: this.money(a.balance) })),
      { label: 'Total Expenses', value: this.money(pl.totalExpenses), bold: true },
    ], themeColor));

    content.push(this.twoColTable([
      { label: 'Net Income', value: this.money(pl.netIncome), bold: true },
    ], themeColor));

    content.push(this.footer(clinic));
    return renderPdfDoc({ content, pageMargins: [40, 40, 40, 40] });
  }

  async generateTrialBalancePdf(clinicId: string, dateTo?: string, branchId?: string): Promise<Buffer> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    const tb = await this.statementsService.getTrialBalance(clinicId, { dateTo, branchId });
    const { content, themeColor } = await this.header(clinic, `Trial Balance${dateTo ? ` — as of ${dateTo}` : ''}`);

    content.push({
      table: {
        widths: ['auto', '*', 80, 80],
        body: [
          [{ text: 'Code', bold: true, fontSize: 9 }, { text: 'Account', bold: true, fontSize: 9 }, { text: 'Debit', bold: true, fontSize: 9, alignment: 'right' }, { text: 'Credit', bold: true, fontSize: 9, alignment: 'right' }],
          ...tb.rows.filter(r => r.debit > 0 || r.credit > 0).map(r => ([
            { text: r.code, fontSize: 9 }, { text: r.name, fontSize: 9 },
            { text: r.debit ? r.debit.toLocaleString() : '', fontSize: 9, alignment: 'right' },
            { text: r.credit ? r.credit.toLocaleString() : '', fontSize: 9, alignment: 'right' },
          ])),
          [{ text: '' }, { text: 'Total', bold: true, fontSize: 9 },
            { text: tb.totalDebit.toLocaleString(), bold: true, fontSize: 9, alignment: 'right' },
            { text: tb.totalCredit.toLocaleString(), bold: true, fontSize: 9, alignment: 'right' }],
        ],
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length) ? 1 : 0.5,
        vLineWidth: () => 0,
        hLineColor: () => PDF_COLORS.border,
      },
      margin: [0, 0, 0, 10] as [number, number, number, number],
    });
    if (!tb.isBalanced) {
      content.push({ text: 'Warning: debits and credits do not net to zero — this indicates a data integrity issue and should be investigated.', color: '#dc2626', fontSize: 9, italics: true });
    }
    content.push(this.footer(clinic));
    return renderPdfDoc({ content, pageMargins: [40, 40, 40, 40] });
  }
}