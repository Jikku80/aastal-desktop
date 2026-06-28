'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, User, X, Loader2 } from 'lucide-react';
import { patientsApi } from '@/lib/api';
import type { Patient } from '@/types';
import { clsx } from 'clsx';

interface Props {
  value?: string;       // patientId
  onChange: (id: string, patient: Patient | null) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export default function PatientCombobox({ value, onChange, placeholder = 'Search patients…', error, disabled }: Props) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const inputRef  = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['patients-search', debouncedSearch],
    queryFn: () => patientsApi.list({ search: debouncedSearch, limit: 12 }).then(r => r.data),
    enabled: open,
    staleTime: 10_000,
  });

  const patients: Patient[] = data?.data || [];

  // Selected patient display
  const { data: selectedData } = useQuery({
    queryKey: ['patient-single', value],
    queryFn: () => patientsApi.get(value!).then(r => r.data),
    enabled: !!value,
    staleTime: 60_000,
  });
  const selectedPatient: Patient | null = selectedData || null;

  const handleSelect = (patient: Patient) => {
    onChange(patient.id, patient);
    setSearch('');
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSearch('');
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <div
        className={clsx(
          'input flex items-center gap-2 cursor-pointer',
          error && 'border-red-500 focus:ring-red-500/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => { if (!disabled) { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); } }}>
        {open ? (
          <>
            <Search size={14} className="text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              onClick={e => e.stopPropagation()}
            />
            {isLoading && <Loader2 size={14} className="animate-spin text-[var(--text-muted)] shrink-0" />}
          </>
        ) : (
          <>
            <User size={14} className="text-[var(--text-muted)] shrink-0" />
            <span className={clsx('flex-1 text-sm truncate', value ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>
              {value && selectedPatient
                ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                : placeholder}
            </span>
            {value ? (
              <X size={13} className="text-[var(--text-muted)] hover:text-red-400 shrink-0" onClick={handleClear} />
            ) : (
              <ChevronDown size={14} className="text-[var(--text-muted)] shrink-0" />
            )}
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl shadow-2xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-5 text-sm text-[var(--text-muted)]">
              <Loader2 size={14} className="animate-spin" /> Searching…
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 py-5">
              <User size={20} className="text-[var(--text-muted)] opacity-40" />
              <p className="text-sm text-[var(--text-muted)]">
                {search ? `No patients matching "${search}"` : 'No patients found'}
              </p>
            </div>
          ) : (
            <ul className="max-h-52 overflow-y-auto">
              {patients.map(patient => (
                <li key={patient.id}>
                  <button type="button"
                    onClick={() => handleSelect(patient)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5',
                      value === patient.id && 'bg-brand-500/10',
                    )}
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-8 h-8 rounded-full bg-brand-600/15 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                      {patient.firstName?.[0]}{patient.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {patient.phone || patient.email || `ID: ${patient.id.slice(0,8)}`}
                      </p>
                    </div>
                    {value === patient.id && <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
