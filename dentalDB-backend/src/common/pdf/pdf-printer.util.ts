// src/common/pdf/pdf-printer.util.ts
//
// Shared pdfmake setup used by every PDF-generating service (invoices,
// prescriptions, health summaries). Replaces the old html-pdf-node /
// puppeteer path.
//
// Why: html-pdf-node depends on Puppeteer, which downloads a full headless
// Chromium binary (~170-280MB) on every `npm install`. That binary then got
// bundled into the Electron desktop app via extraResources, which is what
// was inflating CI time and the final Windows installer size. pdfmake is a
// pure-JS layout engine (built on pdfkit) with no browser and no native
// binary — same output on Windows/macOS/Linux/server, and the exact same
// code path serves web, mobile, and the desktop-bundled backend since all
// three already just call this backend's API for PDFs.
//
// Font choice: uses pdfkit's built-in standard 14 PDF fonts (Helvetica
// family), which ship as AFM metric files inside pdfkit itself — zero
// extra font files, zero downloads. Trade-off: standard PDF fonts only
// render Latin characters properly. If you later need Devanagari/Nepali
// script inside the PDF itself (not just NPR-formatted numbers), a Unicode
// TTF (e.g. Noto Sans) would need to be embedded — flag this if it comes
// up, it's a separate, small follow-up.

// @types/pdfmake only covers the browser bundle's createPdf() API, not the
// Node-only PdfPrinter class this file actually uses (pdfmake's package.json
// "main" points server-side require('pdfmake') at src/printer.js instead).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');
import axios from 'axios';

const FONTS = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

const printer = new PdfPrinter(FONTS);

const DEFAULT_STYLE = { font: 'Helvetica', fontSize: 10, color: '#1f2937' };

/**
 * Renders a pdfmake document definition to a PDF Buffer.
 * `defaultStyle` is applied automatically so callers don't need to repeat it.
 */
export function renderPdfDoc(docDefinition: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = printer.createPdfKitDocument({
        ...docDefinition,
        defaultStyle: { ...DEFAULT_STYLE, ...(docDefinition.defaultStyle || {}) },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Best-effort fetch of a logo/signature image as a base64 data URI, for
 * embedding in a pdfmake `image` node. pdfmake (unlike a browser) can't
 * fetch <img src> URLs itself, so this does it up front. Returns null on
 * any failure (missing file, timeout, offline desktop app with no network
 * reachable for a remote logo, unsupported format) — callers should always
 * fall back to a text/placeholder rendering when this returns null rather
 * than let a PDF fail to generate because of a missing logo.
 */
export async function fetchImageAsDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer', timeout: 5000 });
    const contentType = String(res.headers['content-type'] || '').toLowerCase();
    const mime = contentType.includes('png')
      ? 'image/png'
      : contentType.includes('webp')
        ? 'image/webp'
        : 'image/jpeg'; // jpg/jpeg default; pdfmake supports jpeg/png natively
    if (mime === 'image/webp') return null; // pdfmake/pdfkit can't decode webp
    const base64 = Buffer.from(res.data).toString('base64');
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export const PDF_COLORS = {
  border: '#e5e7eb',
  mutedText: '#6b7280',
  lightText: '#9ca3af',
  darkText: '#1f2937',
  panelBg: '#f9fafb',
};