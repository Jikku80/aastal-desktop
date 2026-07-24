'use client';
import { useEffect, useRef, useState } from 'react';
import { X, Printer, Loader2, Download } from 'lucide-react';
import { BASE_URL } from '@/lib/api';

interface Props {
  recordId: string;
  patientName?: string;
  onClose: () => void;
}

const API_BASE = BASE_URL; // Electron-aware, from lib/api.ts

export default function PrescriptionPreviewModal({ recordId, patientName, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const previewUrl = `${API_BASE}/api/v1/prescriptions/record/${recordId}/preview-html`;
  const pdfUrl     = `${API_BASE}/api/v1/prescriptions/record/${recordId}/pdf`;

  /* ── Close on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── Print via iframe.contentWindow.print() ── */
  const handlePrint = () => {
    const win = iframeRef.current?.contentWindow;
    if (win) {
      win.focus();
      win.print();
    } else {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <>
      {/* print-only: hide everything but the iframe content */}
      <style>{`
        @media print {
          body > *:not(.rx-print-frame) { display: none !important; }
          .rx-print-frame { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; border: none !important; z-index: 99999 !important; }
          .rx-modal-overlay, .rx-modal-toolbar { display: none !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="rx-modal-overlay fixed inset-0 z-[200] modal-clearance flex flex-col items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Modal shell */}
        <div
          className="w-full flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            maxWidth: 820,
            maxHeight: '92vh',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Toolbar */}
          <div
            className="rx-modal-toolbar flex items-center justify-between px-5 py-3 shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div>
              <p className="font-semibold text-[var(--text-primary)] text-sm">Prescription Preview</p>
              {patientName && (
                <p className="text-xs text-[var(--text-muted)]">{patientName}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Download PDF */}
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost flex items-center gap-1.5 text-xs px-3 py-1.5"
                title="Download PDF"
              >
                <Download size={13} /> PDF
              </a>

              {/* Print */}
              <button
                onClick={handlePrint}
                className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5"
              >
                <Printer size={13} /> Print
              </button>

              {/* Close */}
              <button
                onClick={onClose}
                className="btn-ghost w-8 h-8 p-0 flex items-center justify-center ml-1"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Preview iframe */}
          <div className="relative flex-1 overflow-hidden bg-gray-100">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                <Loader2 size={24} className="animate-spin text-gray-400" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <p className="text-red-400 text-sm font-medium mb-2">Failed to load prescription</p>
                <p className="text-xs text-[var(--text-muted)]">{error}</p>
              </div>
            )}
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="rx-print-frame w-full h-full border-none"
              style={{ minHeight: 600 }}
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError('Could not render prescription. Check API connectivity.'); }}
              title="Prescription Preview"
            />
          </div>
        </div>
      </div>
    </>
  );
}