import { Injectable } from '@nestjs/common';
import { renderPdfDoc, PDF_COLORS } from '../common/pdf/pdf-printer.util';

export interface HealthSummaryData {
  account: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    dateOfBirth?: Date;
    gender?: string;
    allergies?: string[];
    chronicConditions?: string[];
    vitals?: Record<string, any>;
  };
  visits: Array<{
    date: Date;
    clinicName: string;
    doctorName: string;
    diagnosis?: string;
    notes?: string;
  }>;
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    clinicName: string;
    prescribedAt: Date;
  }>;
  labResults: Array<{
    title: string;
    clinicName: string;
    date: Date;
    summary?: string;
    results?: Array<{ parameter: string; value: string; unit?: string; referenceRange?: string; flag?: string }>;
  }>;
  generatedAt: Date;
}

@Injectable()
export class HealthSummaryPdfService {
  buildHtml(data: HealthSummaryData): string {
    const { account, visits, medications, labResults, generatedAt } = data;
    const fmtDate = (d: any) =>
      d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

    const allergyBadges = (account.allergies || []).length
      ? account.allergies!.map(a => `<span style="background:#fef2f2;color:#b91c1c;padding:2px 10px;border-radius:12px;font-size:12px;margin:2px;display:inline-block;">${a}</span>`).join(' ')
      : '<span style="color:#9ca3af;font-size:13px;">None reported</span>';

    const conditionBadges = (account.chronicConditions || []).length
      ? account.chronicConditions!.map(c => `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 10px;border-radius:12px;font-size:12px;margin:2px;display:inline-block;">${c}</span>`).join(' ')
      : '<span style="color:#9ca3af;font-size:13px;">None reported</span>';

    const vitals = account.vitals || {};
    const vitalsRows = Object.entries(vitals).filter(([, v]) => v).map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      return `<tr><td style="padding:6px 12px;color:#6b7280;font-size:12px;">${label}</td><td style="padding:6px 12px;font-weight:600;font-size:13px;">${v}</td></tr>`;
    }).join('');

    const visitRows = visits.slice(0, 10).map(v => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 12px;font-size:12px;color:#6b7280;">${fmtDate(v.date)}</td>
        <td style="padding:10px 12px;font-size:13px;font-weight:500;">${v.clinicName}</td>
        <td style="padding:10px 12px;font-size:12px;">${v.doctorName}</td>
        <td style="padding:10px 12px;font-size:12px;color:#374151;">${v.diagnosis || v.notes || '—'}</td>
      </tr>`).join('');

    const medRows = medications.slice(0, 20).map(m => `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 12px;font-size:13px;font-weight:500;">${m.name}</td>
        <td style="padding:10px 12px;font-size:12px;">${m.dosage || '—'}</td>
        <td style="padding:10px 12px;font-size:12px;">${m.frequency || '—'}</td>
        <td style="padding:10px 12px;font-size:12px;color:#6b7280;">${m.clinicName}</td>
      </tr>`).join('');

    const labRows = labResults.slice(0, 20).map(l => {
      const params = l.results || [];
      const paramsHtml = params.length === 0 ? '' : `
        <table style="margin:4px 0 8px;width:100%;background:#fafafa;border:1px solid #f3f4f6;">
          <thead><tr>
            <th style="padding:4px 8px;font-size:10px;text-align:left;color:#6b7280;">Parameter</th>
            <th style="padding:4px 8px;font-size:10px;text-align:left;color:#6b7280;">Value</th>
            <th style="padding:4px 8px;font-size:10px;text-align:left;color:#6b7280;">Reference Range</th>
            <th style="padding:4px 8px;font-size:10px;text-align:left;color:#6b7280;">Flag</th>
          </tr></thead>
          <tbody>${params.map(p => `
            <tr>
              <td style="padding:4px 8px;font-size:11px;">${p.parameter}</td>
              <td style="padding:4px 8px;font-size:11px;font-weight:600;">${p.value}${p.unit ? ' ' + p.unit : ''}</td>
              <td style="padding:4px 8px;font-size:11px;color:#6b7280;">${p.referenceRange || '—'}</td>
              <td style="padding:4px 8px;font-size:11px;${p.flag && p.flag !== 'normal' ? 'color:#dc2626;font-weight:600;' : 'color:#16a34a;'}">${p.flag || 'normal'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`;
      return `
      <tr style="border-bottom:1px solid #f3f4f6;">
        <td style="padding:10px 12px;font-size:13px;vertical-align:top;" colspan="4">
          <div style="display:flex;justify-content:space-between;">
            <strong>${l.title}</strong>
            <span style="color:#6b7280;font-size:12px;">${l.clinicName} · ${fmtDate(l.date)}</span>
          </div>
          ${l.summary ? `<div style="color:#374151;font-size:12px;margin-top:2px;">${l.summary}</div>` : ''}
          ${paramsHtml}
        </td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Health Summary — ${account.firstName} ${account.lastName}</title>
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#111827;background:#fff;padding:36px; }
    h1 { font-size:22px;font-weight:700;color:#0369a1; }
    h2 { font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin:28px 0 10px; }
    table { width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden; }
    thead th { background:#0369a1;color:#fff;padding:9px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em; }
    .section-box { background:#f9fafb;border-radius:10px;padding:14px 16px;margin-bottom:4px; }
    .header-bar { display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:20px;border-bottom:3px solid #0369a1;margin-bottom:8px; }
    .meta-grid { display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:4px; }
    .meta-item label { font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em; }
    .meta-item span { display:block;font-weight:600;font-size:13px;margin-top:2px; }
    .footer { margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center; }
  </style>
</head>
<body>

  <div class="header-bar">
    <div>
      <h1>Health Summary</h1>
      <p style="color:#6b7280;font-size:12px;margin-top:4px;">${account.firstName} ${account.lastName}</p>
    </div>
    <div style="text-align:right;font-size:11px;color:#9ca3af;">
      <div>Generated: ${fmtDate(generatedAt)}</div>
      <div style="color:#ef4444;font-size:10px;margin-top:2px;">CONFIDENTIAL — FOR MEDICAL USE ONLY</div>
    </div>
  </div>

  <!-- Demographics -->
  <h2>Patient Information</h2>
  <div class="section-box">
    <div class="meta-grid">
      <div class="meta-item"><label>Date of Birth</label><span>${fmtDate(account.dateOfBirth)}</span></div>
      <div class="meta-item"><label>Gender</label><span>${account.gender || '—'}</span></div>
      <div class="meta-item"><label>Phone</label><span>${account.phone || '—'}</span></div>
      <div class="meta-item"><label>Email</label><span style="font-size:12px">${account.email || '—'}</span></div>
    </div>
  </div>

  <!-- Allergies -->
  <h2>Allergies</h2>
  <div class="section-box">${allergyBadges}</div>

  <!-- Chronic Conditions -->
  <h2>Chronic Conditions</h2>
  <div class="section-box">${conditionBadges}</div>

  ${vitalsRows ? `
  <!-- Vitals -->
  <h2>Self-Reported Vitals</h2>
  <div class="section-box">
    <table>
      <tbody>${vitalsRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Recent Visits -->
  <h2>Recent Visits (across all clinics)</h2>
  ${visits.length === 0
    ? '<div class="section-box" style="color:#9ca3af;font-size:13px;">No visit history found.</div>'
    : `<table><thead><tr>
        <th>Date</th><th>Clinic</th><th>Doctor</th><th>Diagnosis / Notes</th>
      </tr></thead><tbody>${visitRows}</tbody></table>`}

  <!-- Current Medications -->
  <h2>Current Medications</h2>
  ${medications.length === 0
    ? '<div class="section-box" style="color:#9ca3af;font-size:13px;">No medications on record.</div>'
    : `<table><thead><tr>
        <th>Medication</th><th>Dosage</th><th>Frequency</th><th>Prescribed At</th>
      </tr></thead><tbody>${medRows}</tbody></table>`}

  <!-- Lab Results -->
  <h2>Lab Results &amp; Reports</h2>
  ${labResults.length === 0
    ? '<div class="section-box" style="color:#9ca3af;font-size:13px;">No lab results on file.</div>'
    : `<table><thead><tr>
        <th>Test / Report</th><th>Clinic</th><th>Date</th><th>Summary</th>
      </tr></thead><tbody>${labRows}</tbody></table>`}

  <div class="footer">
    This health summary was generated via Clinic Karobar on ${fmtDate(generatedAt)}.
    Please verify all information with your treating physician before use.
  </div>

</body>
</html>`;
  }

  async generatePdf(data: HealthSummaryData): Promise<Buffer> {
    const { account, visits, medications, labResults, generatedAt } = data;
    const fmtDate = (d: any) =>
      d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

    const badgeRow = (items: string[] | undefined, color: string, bg: string) => {
      if (!items || items.length === 0) {
        return { text: 'None reported', color: PDF_COLORS.lightText, fontSize: 9 };
      }
      return {
        table: { body: [items.map((t) => ({ text: t, color, fillColor: bg, fontSize: 8, bold: true, margin: [6, 3, 6, 3] }))] },
        layout: 'noBorders',
      };
    };

    const vitals = account.vitals || {};
    const vitalsBody = Object.entries(vitals)
      .filter(([, v]) => v)
      .map(([k, v]) => {
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
        return [{ text: label, fontSize: 8, color: PDF_COLORS.mutedText }, { text: String(v), fontSize: 9, bold: true }];
      });

    const sectionTable = (headers: string[], rows: any[][], emptyLabel: string) => {
      if (rows.length === 0) {
        return { text: emptyLabel, color: PDF_COLORS.lightText, fontSize: 9, fillColor: PDF_COLORS.panelBg, margin: [8, 8, 8, 8] };
      }
      return {
        table: {
          headerRows: 1,
          widths: headers.map(() => '*'),
          body: [
            headers.map((h) => ({ text: h, fillColor: '#0369a1', color: '#fff', bold: true, fontSize: 8 })),
            ...rows,
          ],
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => PDF_COLORS.border },
        margin: [0, 0, 0, 4],
      };
    };

    const visitRows = visits.slice(0, 10).map((v) => [
      { text: fmtDate(v.date), fontSize: 8, color: PDF_COLORS.mutedText },
      { text: v.clinicName, fontSize: 9, bold: true },
      { text: v.doctorName, fontSize: 8 },
      { text: v.diagnosis || v.notes || '—', fontSize: 8, color: '#374151' },
    ]);

    const medRows = medications.slice(0, 20).map((m) => [
      { text: m.name, fontSize: 9, bold: true },
      { text: m.dosage || '—', fontSize: 8 },
      { text: m.frequency || '—', fontSize: 8 },
      { text: m.clinicName, fontSize: 8, color: PDF_COLORS.mutedText },
    ]);

    const labRows = labResults.slice(0, 20).map((l) => {
      const params = l.results || [];
      const content: any[] = [
        {
          columns: [
            { text: l.title, bold: true, fontSize: 9, width: '*' },
            { text: `${l.clinicName} · ${fmtDate(l.date)}`, fontSize: 8, color: PDF_COLORS.mutedText, alignment: 'right' },
          ],
        },
      ];
      if (l.summary) content.push({ text: l.summary, fontSize: 8, color: '#374151', margin: [0, 2, 0, 0] });
      if (params.length) {
        content.push({
          table: {
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [{ text: 'Parameter', fontSize: 7, color: PDF_COLORS.mutedText }, { text: 'Value', fontSize: 7, color: PDF_COLORS.mutedText }, { text: 'Reference', fontSize: 7, color: PDF_COLORS.mutedText }, { text: 'Flag', fontSize: 7, color: PDF_COLORS.mutedText }],
              ...params.map((p) => [
                { text: p.parameter, fontSize: 8 },
                { text: `${p.value}${p.unit ? ' ' + p.unit : ''}`, fontSize: 8, bold: true },
                { text: p.referenceRange || '—', fontSize: 8, color: PDF_COLORS.mutedText },
                { text: p.flag || 'normal', fontSize: 8, color: p.flag && p.flag !== 'normal' ? '#dc2626' : '#16a34a', bold: !!(p.flag && p.flag !== 'normal') },
              ]),
            ],
          },
          layout: { hLineWidth: () => 0.5, vLineWidth: () => 0, hLineColor: () => PDF_COLORS.border },
          margin: [0, 4, 0, 0],
        });
      }
      return [{ stack: content, colSpan: 4, fillColor: PDF_COLORS.panelBg, margin: [6, 6, 6, 6] } as any, {}, {}, {}];
    });

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [32, 32, 32, 32],
      content: [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Health Summary', fontSize: 18, bold: true, color: '#0369a1' },
                { text: `${account.firstName} ${account.lastName}`, fontSize: 9, color: PDF_COLORS.mutedText, margin: [0, 2, 0, 0] },
              ],
            },
            {
              width: 220,
              stack: [
                { text: `Generated: ${fmtDate(generatedAt)}`, fontSize: 8, color: PDF_COLORS.lightText, alignment: 'right' },
                { text: 'CONFIDENTIAL — FOR MEDICAL USE ONLY', fontSize: 7, color: '#ef4444', alignment: 'right', margin: [0, 2, 0, 0] },
              ],
            },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 531, y2: 0, lineWidth: 3, lineColor: '#0369a1' }], margin: [0, 10, 0, 16] },

        { text: 'PATIENT INFORMATION', fontSize: 9, bold: true, color: PDF_COLORS.mutedText, margin: [0, 0, 0, 6] },
        {
          table: {
            widths: ['*', '*', '*', '*'],
            body: [[
              { stack: [{ text: 'Date of Birth', fontSize: 7, color: PDF_COLORS.lightText }, { text: fmtDate(account.dateOfBirth), bold: true, fontSize: 9, margin: [0, 2, 0, 0] }] },
              { stack: [{ text: 'Gender', fontSize: 7, color: PDF_COLORS.lightText }, { text: account.gender || '—', bold: true, fontSize: 9, margin: [0, 2, 0, 0] }] },
              { stack: [{ text: 'Phone', fontSize: 7, color: PDF_COLORS.lightText }, { text: account.phone || '—', bold: true, fontSize: 9, margin: [0, 2, 0, 0] }] },
              { stack: [{ text: 'Email', fontSize: 7, color: PDF_COLORS.lightText }, { text: account.email || '—', bold: true, fontSize: 8, margin: [0, 2, 0, 0] }] },
            ]],
          },
          layout: 'noBorders',
          fillColor: PDF_COLORS.panelBg,
          margin: [0, 0, 0, 14],
        },

        { text: 'ALLERGIES', fontSize: 9, bold: true, color: PDF_COLORS.mutedText, margin: [0, 0, 0, 6] },
        { ...badgeRow(account.allergies, '#b91c1c', '#fef2f2'), margin: [0, 0, 0, 14] },

        { text: 'CHRONIC CONDITIONS', fontSize: 9, bold: true, color: PDF_COLORS.mutedText, margin: [0, 0, 0, 6] },
        { ...badgeRow(account.chronicConditions, '#1d4ed8', '#eff6ff'), margin: [0, 0, 0, 14] },

        ...(vitalsBody.length
          ? [
              { text: 'SELF-REPORTED VITALS', fontSize: 9, bold: true, color: PDF_COLORS.mutedText, margin: [0, 0, 0, 6] },
              { table: { widths: ['*', '*'], body: vitalsBody }, layout: 'noBorders', fillColor: PDF_COLORS.panelBg, margin: [0, 0, 0, 14] },
            ]
          : []),

        { text: 'RECENT VISITS (ACROSS ALL CLINICS)', fontSize: 9, bold: true, color: PDF_COLORS.mutedText, margin: [0, 0, 0, 6] },
        { ...sectionTable(['Date', 'Clinic', 'Doctor', 'Diagnosis / Notes'], visitRows, 'No visit history found.'), margin: [0, 0, 0, 14] },

        { text: 'CURRENT MEDICATIONS', fontSize: 9, bold: true, color: PDF_COLORS.mutedText, margin: [0, 0, 0, 6] },
        { ...sectionTable(['Medication', 'Dosage', 'Frequency', 'Clinic'], medRows, 'No medications on record.'), margin: [0, 0, 0, 14] },

        { text: 'LAB RESULTS & REPORTS', fontSize: 9, bold: true, color: PDF_COLORS.mutedText, margin: [0, 0, 0, 6] },
        labResults.length === 0
          ? { text: 'No lab results on file.', color: PDF_COLORS.lightText, fontSize: 9, fillColor: PDF_COLORS.panelBg, margin: [8, 8, 8, 8] }
          : { table: { widths: ['*', '*', '*', '*'], body: labRows }, layout: 'noBorders' },

        {
          text: `This health summary was generated via Clinic Karobar on ${fmtDate(generatedAt)}. Please verify all information with your treating physician before use.`,
          fontSize: 8,
          color: PDF_COLORS.lightText,
          alignment: 'center',
          margin: [0, 30, 0, 0],
        },
      ],
    };

    return renderPdfDoc(docDefinition);
  }
}