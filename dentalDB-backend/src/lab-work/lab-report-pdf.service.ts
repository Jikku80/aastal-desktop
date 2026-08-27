import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LabWork } from './entities/lab-work.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { renderPdfDoc, fetchImageAsDataUri, PDF_COLORS } from '../common/pdf/pdf-printer.util';

/**
 * Phase 7 — lab report PDF, on the same pdfmake pipeline as invoices (no
 * puppeteer, see pdf-printer.util.ts for why). Kept as its own service in
 * the lab-work module rather than folded into billing/pdf.service.ts,
 * matching how prescription-pdf.service.ts and health-summary-pdf.service.ts
 * are already split per domain in this codebase.
 *
 * Phase 8 — now reads `clinic.labReportTemplate`, the same jsonb-column
 * pattern generateInvoicePdf already reads via `clinic.billingTemplate`.
 * Unlike billing/prescription, this report has no separate hand-maintained
 * HTML preview twin to keep in sync — getTemplatePreviewPdf() below renders
 * the exact same docDefinition/pdfmake path as the real report, so the
 * Design Studio preview and the printed PDF can never drift apart.
 */
@Injectable()
export class LabReportPdfService {
  constructor(
    @InjectRepository(Clinic) private clinicRepo: Repository<Clinic>,
  ) {}

  // ── Template helpers (same shape as billing/prescription) ─────────────────
  async getTemplate(clinicId: string): Promise<Record<string, any>> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic.labReportTemplate || {};
  }

  async saveTemplate(clinicId: string, patch: Record<string, any>): Promise<Record<string, any>> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    const merged = { ...(clinic.labReportTemplate || {}), ...patch };
    await this.clinicRepo.update(clinicId, { labReportTemplate: merged });
    return merged;
  }

  /** Renders a sample two-panel report through the real pdfmake pipeline — used by the Design Studio live preview. */
  async getTemplatePreviewPdf(clinicId: string): Promise<Buffer> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const sampleLab: any = {
      testName: 'Liver & Renal Function Test',
      externalRef: 'LAB-PREVIEW-0001',
      resultsReceivedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
      sampleCollectedAt: new Date(),
      resultSummary: 'All parameters within normal limits. Sample preview only.',
      patient: { firstName: 'Sample', lastName: 'Patient', phone: '+977 98XXXXXXXX' },
      orderedBy: { firstName: 'Jane', lastName: 'Smith' },
      results: [
        { panelName: 'Liver Function Test', parameter: 'SGPT (ALT)', value: '28', unit: 'U/L', referenceRange: '7 – 56', method: 'IFCC', flag: 'normal' },
        { panelName: 'Liver Function Test', parameter: 'SGOT (AST)', value: '31', unit: 'U/L', referenceRange: '5 – 40', method: 'IFCC', flag: 'normal' },
        { panelName: 'Liver Function Test', parameter: 'Total Bilirubin', value: '1.4', unit: 'mg/dL', referenceRange: '0.1 – 1.2', method: 'Diazo', flag: 'high' },
        { panelName: 'Renal Function Test', parameter: 'Creatinine', value: '0.9', unit: 'mg/dL', referenceRange: '0.7 – 1.3', method: 'Jaffe', flag: 'normal' },
        { panelName: 'Renal Function Test', parameter: 'Urea', value: '32', unit: 'mg/dL', referenceRange: '15 – 40', method: 'GLDH', flag: 'normal' },
      ],
    };

    return this.generateLabReportPdf(sampleLab, clinic);
  }

  async generateLabReportPdf(lab: LabWork, clinic: Clinic): Promise<Buffer> {
    const fmtDate = (d: any) =>
      d ? new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

    const tpl = clinic?.labReportTemplate || {};
    const themeColor  = tpl.themeColor || '#027cc6';
    const showLogo    = tpl.showLogo === true;
    const showLicense = tpl.showLicenseNumber === true;
    const showMethod  = tpl.showMethodColumn !== false; // default on, matches sample report structure
    const zebraRows   = tpl.zebraStripes === true;

    const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
    let logoDataUri: string | null = null;
    if (showLogo && clinic?.logo) {
      const logoUrl = clinic.logo.startsWith('http') ? clinic.logo : `${API_BASE}${clinic.logo}`;
      logoDataUri = await fetchImageAsDataUri(logoUrl);
    }

    const clinicMetaLines = [
      clinic?.address,
      clinic?.phone,
      clinic?.email,
      showLicense && clinic?.licenseNumber ? `License: ${clinic.licenseNumber}` : null,
    ].filter(Boolean) as string[];

    const headerNote = tpl.headerNote
      ? [{ text: tpl.headerNote, fontSize: 8, color: PDF_COLORS.mutedText, italics: true, margin: [0, 6, 0, 0] as [number, number, number, number] }]
      : [];
    const footerNoteLine = tpl.footerNote ? ` • ${tpl.footerNote}` : '';

    // ── Group results by panel, same rule as the frontend's groupByPanel():
    // rows without an explicit panelName fall into one "General" panel. ──
    const results = lab.results || [];
    const order: string[] = [];
    const byPanel = new Map<string, typeof results>();
    for (const row of results) {
      const key = row.panelName || 'General';
      if (!byPanel.has(key)) { byPanel.set(key, []); order.push(key); }
      byPanel.get(key)!.push(row);
    }
    const panels = order.map(panelName => ({ panelName, rows: byPanel.get(panelName)! }));
    const showPanelHeaders = panels.length > 1 || panels[0]?.panelName !== 'General';

    const FLAG_COLOR: Record<string, string> = {
      critical: '#dc2626',
      high:     '#d97706',
      low:      '#d97706',
      normal:   PDF_COLORS.darkText,
    };

    const buildPanelTable = (rows: typeof results) => ({
      table: {
        headerRows: 1,
        widths: showMethod ? ['*', 55, 40, 90, 60] : ['*', 60, 45, 110],
        body: [
          [
            { text: 'Test Name', fillColor: themeColor, color: '#ffffff', bold: true, fontSize: 8 },
            { text: 'Value', fillColor: themeColor, color: '#ffffff', bold: true, fontSize: 8, alignment: 'right' },
            { text: 'Unit', fillColor: themeColor, color: '#ffffff', bold: true, fontSize: 8 },
            { text: 'Reference Range', fillColor: themeColor, color: '#ffffff', bold: true, fontSize: 8 },
            ...(showMethod ? [{ text: 'Method', fillColor: themeColor, color: '#ffffff', bold: true, fontSize: 8 }] : []),
          ],
          ...rows.map((r, idx) => {
            const flag = r.flag || 'normal';
            const color = FLAG_COLOR[flag] || PDF_COLORS.darkText;
            const bold = flag === 'critical' || flag === 'high' || flag === 'low';
            const rowFill = zebraRows && idx % 2 === 1 ? PDF_COLORS.panelBg : undefined;
            return [
              { text: r.parameter || '—', fontSize: 9, fillColor: rowFill, margin: [0, 3, 0, 3] as [number, number, number, number] },
              { text: r.value || '—', fontSize: 9, bold, color, fillColor: rowFill, alignment: 'right', margin: [0, 3, 0, 3] as [number, number, number, number] },
              { text: r.unit || '—', fontSize: 9, color: PDF_COLORS.mutedText, fillColor: rowFill, margin: [0, 3, 0, 3] as [number, number, number, number] },
              { text: r.referenceRange || '—', fontSize: 9, color: PDF_COLORS.mutedText, fillColor: rowFill, margin: [0, 3, 0, 3] as [number, number, number, number] },
              ...(showMethod ? [{ text: r.method || '—', fontSize: 9, color: PDF_COLORS.mutedText, fillColor: rowFill, margin: [0, 3, 0, 3] as [number, number, number, number] }] : []),
            ];
          }),
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => PDF_COLORS.border,
      },
    });

    const panelBlocks: any[] = panels.flatMap((p, i) => [
      ...(showPanelHeaders
        ? [{
            text: p.panelName.toUpperCase(),
            bold: true,
            fontSize: 10,
            color: '#ffffff',
            fillColor: PDF_COLORS.darkText,
            margin: [6, 4, 6, 4] as [number, number, number, number],
          }]
        : []),
      { ...buildPanelTable(p.rows), margin: [0, 0, 0, i === panels.length - 1 ? 0 : 16] as [number, number, number, number] },
    ]);

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [36, 36, 36, 60],
      content: [
        // ── Clinic header / report title ────────────────────────────────
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'LABORATORY REPORT', fontSize: 18, bold: true, color: PDF_COLORS.darkText },
                { text: lab.testName, bold: true, margin: [0, 6, 0, 2] },
                { text: `Report Date: ${fmtDate(lab.resultsReceivedAt || lab.updatedAt)}`, color: PDF_COLORS.mutedText, fontSize: 9 },
                ...(lab.externalRef ? [{ text: `Ref: ${lab.externalRef}`, color: PDF_COLORS.mutedText, fontSize: 9 }] : []),
                ...headerNote,
              ],
            },
            {
              width: 220,
              stack: [
                ...(logoDataUri ? [{ image: logoDataUri, width: 100, alignment: 'right' as const, margin: [0, 0, 0, 6] as [number, number, number, number] }] : []),
                { text: clinic?.name || 'Dental Clinic', bold: true, alignment: 'right' as const },
                ...clinicMetaLines.map((line) => ({ text: line, fontSize: 8, color: PDF_COLORS.mutedText, alignment: 'right' as const })),
              ],
            },
          ],
          columnGap: 20,
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 523, y2: 0, lineWidth: 3, lineColor: themeColor }], margin: [0, 16, 0, 20] },

        // ── Patient / order info ────────────────────────────────────────
        {
          columns: [
            {
              width: '*',
              fillColor: PDF_COLORS.panelBg,
              margin: [10, 8, 10, 8],
              stack: [
                { text: 'PATIENT', fontSize: 7, bold: true, color: PDF_COLORS.lightText },
                { text: `${lab.patient?.firstName || ''} ${lab.patient?.lastName || ''}`.trim(), bold: true, margin: [0, 4, 0, 0] },
                ...(lab.patient?.phone ? [{ text: lab.patient.phone, fontSize: 9 }] : []),
              ],
            },
            {
              width: '*',
              fillColor: PDF_COLORS.panelBg,
              margin: [10, 8, 10, 8],
              stack: [
                { text: 'ORDERING PHYSICIAN', fontSize: 7, bold: true, color: PDF_COLORS.lightText },
                { text: `Dr. ${lab.orderedBy?.firstName || ''} ${lab.orderedBy?.lastName || ''}`.trim(), bold: true, margin: [0, 4, 0, 0], fontSize: 9 },
                { text: `Ordered: ${fmtDate(lab.createdAt)}`, fontSize: 8, color: PDF_COLORS.mutedText },
                ...(lab.sampleCollectedAt ? [{ text: `Collected: ${fmtDate(lab.sampleCollectedAt)}`, fontSize: 8, color: PDF_COLORS.mutedText }] : []),
              ],
            },
          ],
          columnGap: 16,
          margin: [0, 0, 0, 20],
        },

        // ── Grouped panel result tables ─────────────────────────────────
        ...panelBlocks,

        // ── Summary ──────────────────────────────────────────────────────
        ...(lab.resultSummary
          ? [{
              text: [{ text: 'Interpretation: ', bold: true, color: PDF_COLORS.darkText }, lab.resultSummary],
              fillColor: PDF_COLORS.panelBg,
              fontSize: 9,
              color: PDF_COLORS.mutedText,
              margin: [10, 20, 10, 8] as [number, number, number, number],
            }]
          : []),

        // ── Signatures block ─────────────────────────────────────────────
        {
          columns: [
            {
              width: '*',
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS.border }] },
                { text: 'Lab Technician', fontSize: 8, color: PDF_COLORS.mutedText, margin: [0, 4, 0, 0] },
              ],
            },
            {
              width: '*',
              stack: [
                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 180, y2: 0, lineWidth: 0.5, lineColor: PDF_COLORS.border }] },
                { text: 'Verified By / Pathologist', fontSize: 8, color: PDF_COLORS.mutedText, margin: [0, 4, 0, 0] },
              ],
            },
          ],
          columnGap: 20,
          margin: [0, 50, 0, 0],
        },

        {
          text: `Generated by DentalOS • ${new Date().getFullYear()}${footerNoteLine}`,
          fontSize: 8,
          color: PDF_COLORS.lightText,
          alignment: 'center',
          margin: [0, 40, 0, 0],
        },
      ],
    };
    return renderPdfDoc(docDefinition);
  }
}
