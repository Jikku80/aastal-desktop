'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CLINIC_TYPES, type ClinicTypeId } from '@/lib/clinicalOptions';

/**
 * Two-level quick-pick helper for the Diagnosis / Treatment Plan fields.
 *
 * Instead of one long flat row of chips, the person first picks a clinic
 * type (Dental / Eye / Skin / Ortho / Other), which opens a dropdown listing
 * that type's specific options. Picking an option appends it to the field
 * (via onPick) and the dropdown stays open so more than one option can be
 * added in a row; clicking the same type again, picking another type, or
 * clicking outside closes it.
 */
export default function CategoryOptionPicker({
  optionsByType,
  onPick,
}: {
  optionsByType: Record<ClinicTypeId, string[]>;
  onPick: (text: string) => void;
}) {
  const [openType, setOpenType] = useState<ClinicTypeId | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openType) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenType(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openType]);

  return (
    <div ref={containerRef} className="relative mb-1.5">
      <div className="flex gap-1.5 overflow-x-auto pb-1.5">
        {CLINIC_TYPES.map(type => {
          const active = openType === type.id;
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => setOpenType(active ? null : type.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 border"
              style={{
                background: active ? 'var(--brand)' : 'var(--bg-elevated)',
                color:      active ? '#fff' : 'var(--text-secondary)',
                borderColor: active ? 'var(--brand)' : 'var(--border)',
              }}>
              {type.label}
              <ChevronDown size={11} className={active ? 'rotate-180 transition-transform' : 'transition-transform'} />
            </button>
          );
        })}
      </div>

      {openType && (
        <div
          className="absolute z-20 left-0 right-0 mt-1 rounded-xl p-2 shadow-lg max-h-48 overflow-y-auto"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div className="flex flex-wrap gap-1.5">
            {optionsByType[openType].map(option => (
              <button
                key={option}
                type="button"
                onClick={() => onPick(option)}
                className="px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors
                  text-[var(--text-secondary)] hover:text-brand-400 hover:border-brand-500/50 border border-[var(--border)]"
                style={{ background: 'var(--bg-elevated)' }}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}