import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Clinic } from '../clinics/entities/clinic.entity';
import { User } from '../users/entities/user.entity';
import { ClinicalRecord } from '../clinical-records/entities/clinical-record.entity';
import { Appointment } from '../appointments/entities/appointment.entity';
import { renderPdfDoc, fetchImageAsDataUri, PDF_COLORS } from '../common/pdf/pdf-printer.util';

export interface PrescriptionPrintData {
  clinicalRecord:  ClinicalRecord;
  doctor:          User;
  clinic:          Clinic;
}

@Injectable()
export class PrescriptionPdfService {
  constructor(
    @InjectRepository(Clinic)          private clinicRepo:       Repository<Clinic>,
    @InjectRepository(User)            private userRepo:          Repository<User>,
    @InjectRepository(ClinicalRecord)  private recordRepo:        Repository<ClinicalRecord>,
    @InjectRepository(Appointment)     private appointmentRepo:   Repository<Appointment>,
  ) {}

  // ── Template helpers ─────────────────────────────────────────────────────────

  async getTemplate(clinicId: string): Promise<Record<string, any>> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic.prescriptionTemplate || {};
  }

  async saveTemplate(clinicId: string, patch: Record<string, any>): Promise<Record<string, any>> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    const merged = { ...(clinic.prescriptionTemplate || {}), ...patch };
    await this.clinicRepo.update(clinicId, { prescriptionTemplate: merged });
    return merged;
  }

  async getClinicForPreview(clinicId: string): Promise<Clinic> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');
    return clinic;
  }

  // ── HTML builders ─────────────────────────────────────────────────────────────

  buildPrescriptionHtml(
    record: any,
    clinic: Clinic,
    template: Record<string, any>,
    _date: Date,
  ): string {
    const enrichedClinic = {
      ...clinic,
      prescriptionTemplate: { ...(clinic.prescriptionTemplate || {}), ...template },
    } as Clinic;
    const doctor: User = record.doctor ?? ({ firstName: '', lastName: '' } as any);
    return this.buildHtml({ clinicalRecord: record as ClinicalRecord, doctor, clinic: enrichedClinic });
  }

  async buildPreviewHtml(clinicId: string, recordId: string): Promise<{ html: string }> {
    return this._buildHtmlForRecord(clinicId, recordId);
  }

  // ── PDF generators ────────────────────────────────────────────────────────────

  async generateForRecord(clinicId: string, recordId: string): Promise<Buffer> {
    const { data } = await this._buildHtmlForRecord(clinicId, recordId);
    return this.renderPrescriptionPdf(data);
  }

  async generateForAppointment(clinicId: string, appointmentId: string): Promise<Buffer> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId, clinicId },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const record = await this.recordRepo.findOne({
      where: { appointmentId, clinicId } as any,
      order: { createdAt: 'DESC' },
    } as any);
    if (!record) throw new NotFoundException('No clinical record found for this appointment');

    const { data } = await this._buildHtmlForRecord(clinicId, record.id);
    return this.renderPrescriptionPdf(data);
  }

  // ── Internal helpers ──────────────────────────────────────────────────────────

  private async _buildHtmlForRecord(
    clinicId: string,
    recordId: string,
  ): Promise<{ html: string; data: PrescriptionPrintData }> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const record = await this.recordRepo.findOne({ where: { id: recordId, clinicId } });
    if (!record) throw new NotFoundException('Clinical record not found');

    const doctorId =
      (record as any).doctorId ??
      (record as any).dentistId ??
      (record as any).createdById;
    const doctor: User = doctorId
      ? (await this.userRepo.findOne({ where: { id: doctorId } })) ??
        ({ firstName: 'Unknown', lastName: '' } as any)
      : ({ firstName: 'Unknown', lastName: '' } as any);

    const data: PrescriptionPrintData = { clinicalRecord: record, doctor, clinic };
    const html = this.buildHtml(data);
    return { html, data };
  }

  /**
   * Generate prescription HTML/PDF.
   *
   * Key changes (feature #11):
   * - Logo is always pulled from clinic.logo — NOT from prescriptionTemplate
   * - Signature is always pulled from the LOGGED-IN doctor's profile (user.signature)
   * - No "select signature" or "upload logo" in settings — those are removed
   */
  async generate(clinicId: string, recordId: string, doctorId: string): Promise<Buffer> {
    const clinic = await this.clinicRepo.findOne({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found');

    const doctor = await this.userRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const record = await this.recordRepo.findOne({
      where: { id: recordId, clinicId },
    });
    if (!record) throw new NotFoundException('Clinical record not found');

    return this.renderPrescriptionPdf({ clinicalRecord: record, doctor, clinic });
  }

  buildHtml({ clinicalRecord, doctor, clinic }: PrescriptionPrintData): string {
    const API_BASE     = process.env.API_BASE_URL || 'http://localhost:4000';
    const tpl          = clinic.prescriptionTemplate || {};
    const themeColor   = tpl.themeColor || '#0369a1';

    // ── Logo: always from clinic.logo ─────────────────────────────────────────
    const logoSrc   = clinic.logo
      ? (clinic.logo.startsWith('http') ? clinic.logo : `${API_BASE}${clinic.logo}`)
      : null;
    const logoHtml  = logoSrc
      ? `<img src="${logoSrc}" alt="logo" style="max-height:60px;max-width:180px;object-fit:contain;" />`
      : `<div style="font-size:22px;font-weight:700;color:${themeColor};">${clinic.name}</div>`;

    // ── Signature: always from doctor.signature (profile field) ───────────────
    const sigSrc    = (doctor as any).signature
      ? ((doctor as any).signature.startsWith('http')
          ? (doctor as any).signature
          : `${API_BASE}${(doctor as any).signature}`)
      : null;
    const sigHtml   = sigSrc
      ? `<img src="${sigSrc}" alt="signature" style="max-height:70px;max-width:200px;object-fit:contain;" />`
      : `<div style="height:50px;border-bottom:1px solid #374151;width:180px;"></div>`;

    const fmtDate   = (d: any) => d
      ? new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

    const rxRows    = (clinicalRecord.prescriptions || []).map((p: any) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-weight:600;">${p.medicineName}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">${p.dosage || '—'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">${p.frequency || '—'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;">${p.duration || '—'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;">${p.instructions || ''}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Prescription</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #111827; background: #fff; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid ${themeColor}; margin-bottom: 24px; }
    .clinic-info { font-size: 12px; color: #6b7280; margin-top: 6px; line-height: 1.6; }
    .rx-symbol { font-size: 48px; font-weight: 900; color: ${themeColor}; line-height: 1; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; background: #f9fafb; padding: 16px; border-radius: 8px; }
    .meta-item label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-item span  { display: block; font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
    thead th { background: ${themeColor}; color: #fff; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    .notes-box { background: #f9fafb; border-left: 3px solid ${themeColor}; padding: 14px 16px; border-radius: 4px; margin-bottom: 32px; }
    .signature-area { display: flex; flex-direction: column; align-items: flex-end; }
    .doctor-name { font-weight: 700; font-size: 14px; margin-top: 4px; }
    .doctor-title { font-size: 12px; color: #6b7280; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      ${logoHtml}
      <div class="clinic-info">
        ${clinic.address ? `<div>${clinic.address}${clinic.city ? ', ' + clinic.city : ''}</div>` : ''}
        ${clinic.phone   ? `<div>Tel: ${clinic.phone}</div>` : ''}
        ${clinic.email   ? `<div>Email: ${clinic.email}</div>` : ''}
      </div>
    </div>
    <div class="rx-symbol">℞</div>
  </div>

  <!-- PATIENT META -->
  <div class="meta-grid">
    <div class="meta-item">
      <label>Patient Name</label>
      <span>${(clinicalRecord as any).patient?.firstName || ''} ${(clinicalRecord as any).patient?.lastName || '—'}</span>
    </div>
    <div class="meta-item">
      <label>Date</label>
      <span>${fmtDate(clinicalRecord.createdAt)}</span>
    </div>
    <div class="meta-item">
      <label>Age / Gender</label>
      <span>${(clinicalRecord as any).patient?.age || '—'} / ${(clinicalRecord as any).patient?.gender || '—'}</span>
    </div>
    <div class="meta-item">
      <label>Diagnosis</label>
      <span>${clinicalRecord.diagnosisNotes?.slice(0, 80) || '—'}</span>
    </div>
  </div>

  <!-- PRESCRIPTIONS TABLE -->
  <table>
    <thead>
      <tr>
        <th>Medicine</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Instructions</th>
      </tr>
    </thead>
    <tbody>
      ${rxRows || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#9ca3af;">No prescriptions</td></tr>'}
    </tbody>
  </table>

  <!-- NOTES -->
  ${clinicalRecord.treatmentPlan ? `
  <div class="notes-box">
    <strong>Treatment Notes:</strong><br/>
    <span style="font-size:12px;color:#374151;">${clinicalRecord.treatmentPlan}</span>
  </div>
  ` : ''}

  <!-- SIGNATURE -->
  <div class="signature-area">
    ${sigHtml}
    <div class="doctor-name">Dr. ${doctor.firstName} ${doctor.lastName}</div>
    <div class="doctor-title">${(doctor as any).specialization || (doctor as any).role || 'Physician'}</div>
  </div>

  <div class="footer">
    This prescription is generated electronically via ${clinic.name} — Clinic Karobar
  </div>

</body>
</html>`;
  }

  private async renderPrescriptionPdf({ clinicalRecord, doctor, clinic }: PrescriptionPrintData): Promise<Buffer> {
    const API_BASE   = process.env.API_BASE_URL || 'http://localhost:4000';
    const tpl        = clinic.prescriptionTemplate || {};
    const themeColor = tpl.themeColor || '#0369a1';

    const logoUrl = clinic.logo
      ? (clinic.logo.startsWith('http') ? clinic.logo : `${API_BASE}${clinic.logo}`)
      : null;
    const logoDataUri = await fetchImageAsDataUri(logoUrl);

    const sigUrl = (doctor as any).signature
      ? ((doctor as any).signature.startsWith('http') ? (doctor as any).signature : `${API_BASE}${(doctor as any).signature}`)
      : null;
    const sigDataUri = await fetchImageAsDataUri(sigUrl);

    const fmtDate = (d: any) => d
      ? new Date(d).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })
      : '—';

    const rxBody = (clinicalRecord.prescriptions || []).map((p: any) => [
      { text: p.medicineName, bold: true, fontSize: 9 },
      { text: p.dosage || '—', fontSize: 9 },
      { text: p.frequency || '—', fontSize: 9 },
      { text: p.duration || '—', fontSize: 9 },
      { text: p.instructions || '', fontSize: 8, color: PDF_COLORS.mutedText },
    ]);
    if (rxBody.length === 0) {
      rxBody.push([{ text: 'No prescriptions', colSpan: 5, alignment: 'center', color: PDF_COLORS.lightText, fontSize: 9 } as any, {}, {}, {}, {}]);
    }

    const patient = (clinicalRecord as any).patient || {};

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [32, 32, 32, 32],
      content: [
        {
          columns: [
            {
              width: '*',
              stack: [
                ...(logoDataUri
                  ? [{ image: logoDataUri, width: 90 }]
                  : [{ text: clinic.name, fontSize: 18, bold: true, color: themeColor }]),
                ...[clinic.address ? `${clinic.address}${clinic.city ? ', ' + clinic.city : ''}` : null, clinic.phone ? `Tel: ${clinic.phone}` : null, clinic.email ? `Email: ${clinic.email}` : null]
                  .filter(Boolean)
                  .map((line) => ({ text: line, fontSize: 8, color: PDF_COLORS.mutedText })),
              ],
            },
            { width: 60, text: 'Rx', fontSize: 36, bold: true, color: themeColor, alignment: 'right' },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 531, y2: 0, lineWidth: 3, lineColor: themeColor }], margin: [0, 12, 0, 16] },

        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { stack: [{ text: 'PATIENT NAME', fontSize: 7, color: PDF_COLORS.lightText }, { text: `${patient.firstName || ''} ${patient.lastName || '—'}`.trim(), bold: true, fontSize: 10, margin: [0, 2, 0, 0] }] },
                { stack: [{ text: 'DATE', fontSize: 7, color: PDF_COLORS.lightText }, { text: fmtDate(clinicalRecord.createdAt), bold: true, fontSize: 10, margin: [0, 2, 0, 0] }] },
              ],
              [
                { stack: [{ text: 'AGE / GENDER', fontSize: 7, color: PDF_COLORS.lightText }, { text: `${patient.age || '—'} / ${patient.gender || '—'}`, bold: true, fontSize: 10, margin: [0, 2, 0, 0] }] },
                { stack: [{ text: 'DIAGNOSIS', fontSize: 7, color: PDF_COLORS.lightText }, { text: (clinicalRecord.diagnosisNotes || '—').slice(0, 80), bold: true, fontSize: 10, margin: [0, 2, 0, 0] }] },
              ],
            ],
          },
          layout: 'noBorders',
          fillColor: PDF_COLORS.panelBg,
          margin: [0, 0, 0, 20],
        },

        {
          table: {
            headerRows: 1,
            widths: ['*', 60, 65, 55, '*'],
            body: [
              [
                { text: 'Medicine', fillColor: themeColor, color: '#fff', bold: true, fontSize: 9 },
                { text: 'Dosage', fillColor: themeColor, color: '#fff', bold: true, fontSize: 9 },
                { text: 'Frequency', fillColor: themeColor, color: '#fff', bold: true, fontSize: 9 },
                { text: 'Duration', fillColor: themeColor, color: '#fff', bold: true, fontSize: 9 },
                { text: 'Instructions', fillColor: themeColor, color: '#fff', bold: true, fontSize: 9 },
              ],
              ...rxBody,
            ],
          },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => PDF_COLORS.border },
          margin: [0, 0, 0, 28],
        },

        ...(clinicalRecord.treatmentPlan
          ? [{
              table: { widths: ['*'], body: [[{ text: [{ text: 'Treatment Notes: ', bold: true }, { text: clinicalRecord.treatmentPlan, fontSize: 9, color: PDF_COLORS.mutedText }], margin: [8, 8, 8, 8] }]] },
              layout: 'noBorders',
              fillColor: PDF_COLORS.panelBg,
              margin: [0, 0, 0, 28] as [number, number, number, number],
            }]
          : []),

        {
          columns: [
            { width: '*', text: '' },
            {
              width: 200,
              stack: [
                ...(sigDataUri
                  ? [{ image: sigDataUri, width: 140, alignment: 'right' as const }]
                  : [{ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 140, y2: 0, lineWidth: 1, lineColor: '#374151' }], alignment: 'right' as const }]),
                { text: `Dr. ${doctor.firstName} ${doctor.lastName}`, bold: true, fontSize: 11, alignment: 'right', margin: [0, 4, 0, 0] },
                { text: (doctor as any).specialization || (doctor as any).role || 'Physician', fontSize: 9, color: PDF_COLORS.mutedText, alignment: 'right' },
              ],
            },
          ],
        },

        {
          text: `This prescription is generated electronically via ${clinic.name} — Clinic Karobar`,
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