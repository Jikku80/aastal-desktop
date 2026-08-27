import toast from 'react-hot-toast';
import { BASE_URL as API_BASE_URL } from '@/lib/api';

/**
 * Fetches the invoice PDF (or HTML fallback) from the existing
 * `GET /billing/invoices/:id/pdf` endpoint and triggers a browser download.
 *
 * Extracted from InvoiceDetailPanel's original `handleDownloadPdf` so it has
 * a single implementation shared by both the manual "PDF" button there and
 * the post-save print prompt in InvoiceModal (Phase 6) — fix it once, not
 * twice.
 */
export async function downloadInvoicePdf(invoiceId: string, invoiceNumber: string): Promise<void> {
  const apiBase = API_BASE_URL; // Electron-aware, from lib/api.ts
  const url     = `${apiBase}/api/v1/billing/invoices/${invoiceId}/pdf`;
  const response = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!response.ok) throw new Error(`Server returned ${response.status}`);
  const contentType = response.headers.get('content-type') || 'application/pdf';
  const isHtml      = contentType.includes('text/html');
  const blob        = await response.blob();
  const typedBlob   = new Blob([blob], { type: isHtml ? 'text/html;charset=utf-8' : 'application/pdf' });
  const objectUrl   = URL.createObjectURL(typedBlob);
  const a           = document.createElement('a');
  a.href = objectUrl;
  a.download = `Invoice-${invoiceNumber}.${isHtml ? 'html' : 'pdf'}`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  toast.success(isHtml ? 'Invoice saved — print as PDF (Ctrl+P)' : 'PDF downloaded!');
}
