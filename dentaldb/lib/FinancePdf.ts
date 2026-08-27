import toast from 'react-hot-toast';
import { BASE_URL as API_BASE_URL } from '@/lib/api';

/**
 * Fetches a Phase 9 financial-statement PDF (Trial Balance / Balance Sheet /
 * Profit & Loss) and triggers a browser download. Mirrors downloadInvoicePdf
 * (lib/invoicePdf.ts, Phase 6) and downloadLabReportPdf (lib/labReportPdf.ts,
 * Phase 7) exactly — same fetch/blob/anchor pattern, same Electron-aware
 * BASE_URL — so every PDF download flow in the app behaves identically.
 */
export async function downloadFinanceStatementPdf(
  path: string,          // e.g. '/finance/trial-balance/pdf?dateTo=2026-08-26'
  filename: string,      // e.g. 'Trial-Balance.pdf'
): Promise<void> {
  const apiBase  = API_BASE_URL;
  const url      = `${apiBase}/api/v1${path}`;
  const response = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  const blob      = await response.blob();
  const typedBlob = new Blob([blob], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(typedBlob);
  const a         = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  toast.success('PDF downloaded!');
}