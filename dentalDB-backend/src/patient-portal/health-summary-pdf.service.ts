import { Injectable } from '@nestjs/common';

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
    const html = this.buildHtml(data);

    try {
      const htmlPdf = require('html-pdf-node');
      const options = {
        format: 'A4', printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      };
      return await new Promise((res, rej) =>
        htmlPdf.generatePdf({ content: html }, options, (err: any, buf: Buffer) =>
          err ? rej(err) : res(buf),
        ),
      );
    } catch { /* fall through */ }

    try {
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buf = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();
      return Buffer.from(buf);
    } catch { /* fall through */ }

    // Last resort: return the HTML as a UTF-8 buffer
    return Buffer.from(html, 'utf-8');
  }
}