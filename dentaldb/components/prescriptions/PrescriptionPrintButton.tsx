'use client';
import { useState } from 'react';
import { Printer } from 'lucide-react';
import PrescriptionPreviewModal from './PrescriptionPreviewModal';

interface Props {
  recordId: string;
  patientName?: string;
  /** When true, renders as an icon-only ghost button; when false renders a labelled button */
  iconOnly?: boolean;
  className?: string;
}

export default function PrescriptionPrintButton({
  recordId,
  patientName,
  iconOnly = false,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        className={iconOnly ? `btn-ghost w-7 h-7 p-0 flex items-center justify-center ${className}` : `btn-ghost flex items-center gap-1.5 text-xs px-2 py-1 ${className}`}
        title="Print prescription"
      >
        <Printer size={iconOnly ? 13 : 12} />
        {!iconOnly && <span>Print Rx</span>}
      </button>

      {open && (
        <PrescriptionPreviewModal
          recordId={recordId}
          patientName={patientName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}