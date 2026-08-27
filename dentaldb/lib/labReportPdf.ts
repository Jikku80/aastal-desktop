import toast from 'react-hot-toast';
import { BASE_URL as API_BASE_URL } from '@/lib/api';

/**
 * Fetches the lab report PDF from `GET /lab-work/:id/pdf` and triggers a
 * browser download. Mirrors downloadInvoicePdf (lib/invoicePdf.ts, Phase 6)
 * exactly — same fetch/blob/anchor pattern, same Electron-aware BASE_URL —
 * so both PDF flows behave identically and only differ in which endpoint
 * and filename they use.
 */
export async function downloadLabReportPdf(labWorkId: string, testName: string): Promise<void> {
  const apiBase = API_BASE_URL;
  const url     = `${apiBase}/api/v1/lab-work/${labWorkId}/pdf`;
  const response = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  const blob      = await response.blob();
  const typedBlob = new Blob([blob], { type: 'application/pdf' });
  const objectUrl = URL.createObjectURL(typedBlob);
  const safeName  = testName.replace(/[^a-z0-9]+/gi, '-');
  const a         = document.createElement('a');
  a.href = objectUrl;
  a.download = `Lab-Report-${safeName}.pdf`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  toast.success('PDF downloaded!');
}
