'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, User, Phone, Mail, ChevronRight, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useCalendarType } from '@/hooks/useCalendarType';
import { formatDate } from '@/lib/calendar';
import { usePermissions } from '@/store/permissions.store';
import Header from '@/components/layout/Header';
import NoBranchBanner from '@/components/layout/NoBranchBanner';
import PermissionGate from '@/components/rbac/PermissionGate';
import PatientModal from '@/components/patients/PatientModal';
import ImportPatientsModal from '@/components/patients/ImportPatientsModal';
import PatientDetailPanel from '@/components/patients/PatientDetailPanel';
import { useContextPanelStore } from '@/store/contextpanel.store';
import type { Patient } from '@/types';
import { useBranchReadOnly } from '@/hooks/useBranchReadOnly';

export default function PatientsPage() {
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [showModal, setShowModal]     = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [selected, setSelected]       = useState<Patient | null>(null);
  const setSelectedPatient = useContextPanelStore(s => s.setSelectedPatient);
  const clearContext       = useContextPanelStore(s => s.clear);
  const selectPatient = (p: Patient) => { setSelected(p); setSelectedPatient(p); };
  const closePatient   = () => { setSelected(null); clearContext(); };
  useEffect(() => () => clearContext(), [clearContext]);
  const qc = useQueryClient();
  const { activeBranch } = useAuthStore();
  const calendarType = useCalendarType();
  const { can } = usePermissions();
  const { isReadOnly: branchLocked } = useBranchReadOnly();
  const canManage = (can('patient.create') || can('patient.update')) && !branchLocked;

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, search, activeBranch?.id],
    queryFn: () => patientsApi.list({ page, limit: 20, search, branchId: activeBranch?.id }).then(r => r.data),
  });

  const patients: Patient[] = data?.data || [];
  const total = data?.total || 0;

  const handleSuccess = () => {
    setShowModal(false);
    qc.invalidateQueries({ queryKey: ['patients'] });
    toast.success('Patient saved!');
  };

  const handleImportSuccess = () => {
    setShowImport(false);
    qc.invalidateQueries({ queryKey: ['patients'] });
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Patients" action={canManage ? {
        label: 'Add patient',
        onClick: () => {
          if (!activeBranch) { toast.error('Select a branch before adding a patient.'); return; }
          setShowModal(true);
        }
      } : undefined} />
      {!activeBranch && <div className="px-4 pt-3 shrink-0"><NoBranchBanner action="create patients" /></div>}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 lg:p-5">

          {/* Search bar + Import button */}
          <div className="flex items-center gap-3 mb-3 shrink-0">
            <div className="relative flex-1" style={{ maxWidth: '380px' }}>
              <Search
                size={14}
                className="pointer-events-none absolute z-10 text-[var(--text-muted)]"
                style={{ top: '50%', left: '12px', transform: 'translateY(-50%)' }}
              />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search name, phone, email, OPD No…"
                className="input w-full"
                style={{ paddingLeft: '2.25rem', paddingRight: search ? '2rem' : '0.75rem' }}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setPage(1); }}
                  className="absolute z-10 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  style={{ top: '50%', right: '10px', transform: 'translateY(-50%)' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)] shrink-0 hidden sm:block">
              {total} patient{total !== 1 ? 's' : ''}
            </p>

            {/* Import from CSV/Excel */}
            {canManage && (
              <button
                onClick={() => {
                  if (!activeBranch) { toast.error('Select a branch first.'); return; }
                  setShowImport(true);
                }}
                className="btn-secondary flex items-center gap-1.5 text-xs py-2 px-3 shrink-0">
                <Upload size={13} />
                <span className="hidden sm:inline">Import</span>
              </button>
            )}
          </div>

          {/* ── Mobile cards ── */}
          <div className="sm:hidden flex-1 overflow-y-auto space-y-2">
            {isLoading
              ? Array(6).fill(0).map((_, i) => (
                <div key={i} className="card p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                      <div className="h-2.5 bg-white/10 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))
              : patients.length === 0
              ? (
                <div className="text-center py-14">
                  <User size={28} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
                  <p className="text-sm text-[var(--text-muted)]">{search ? `No results for "${search}"` : 'No patients yet'}</p>
                </div>
              )
              : patients.map(p => (
                <motion.button key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  onClick={() => selectPatient(p)}
                  className="w-full card p-4 text-left hover:border-brand-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600/15 flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">
                      {p.firstName?.[0]}{p.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{p.opdNo ? `OPD: ${p.opdNo} · ` : ''}{p.phone || p.email || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge text-[10px] ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <ChevronRight size={13} className="text-[var(--text-muted)]" />
                    </div>
                  </div>
                </motion.button>
              ))
            }
          </div>

          {/* ── Desktop table ── */}
          <div className="hidden sm:flex flex-1 overflow-hidden rounded-xl flex-col" style={{ border: '1px solid var(--border)' }}>
            <div className="overflow-y-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 z-10"
                  style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Patient','Contact','Age / Gender','Registered','Status',''].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading
                    ? Array(8).fill(0).map((_, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        {[140,100,80,100,60,20].map((w, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="h-4 rounded animate-pulse bg-white/5" style={{ width: w }} />
                          </td>
                        ))}
                      </tr>
                    ))
                    : patients.length === 0
                    ? (
                      <tr><td colSpan={6} className="text-center py-16">
                        <User size={28} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
                        <p className="text-sm text-[var(--text-muted)]">{search ? `No results for "${search}"` : 'No patients yet'}</p>
                      </td></tr>
                    )
                    : patients.map((p, i) => (
                      <motion.tr key={p.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                        onClick={() => selectPatient(p)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-600/15 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0">
                              {p.firstName?.[0]}{p.lastName?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{p.firstName} {p.lastName}</p>
                              <p className="text-[11px] text-[var(--text-muted)]">{p.opdNo ? `OPD: ${p.opdNo}` : `#${p.id.slice(0,8)}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            {p.phone && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5"><Phone size={10} className="shrink-0" />{p.phone}</p>}
                            {p.email && <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 truncate max-w-[160px]"><Mail size={10} className="shrink-0" />{p.email}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {(p.ageYears ?? p.age) ? `${p.ageYears ?? p.age} yrs` : '—'}{p.gender ? ` · ${p.gender}` : ''}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                          {p.createdAt ? formatDate(new Date(p.createdAt), calendarType) : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`badge text-[10px] ${p.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <ChevronRight size={14} className="text-[var(--text-muted)]" />
                        </td>
                      </motion.tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <p className="text-xs text-[var(--text-muted)]">
                  {((page-1)*20)+1}–{Math.min(page*20, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">← Prev</button>
                  <button disabled={page*20 >= total} onClick={() => setPage(p => p+1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next →</button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile pagination */}
          {data?.totalPages > 1 && (
            <div className="sm:hidden flex items-center justify-between mt-3 shrink-0">
              <p className="text-xs text-[var(--text-muted)]">{((page-1)*20)+1}–{Math.min(page*20,total)} of {total}</p>
              <div className="flex gap-2">
                <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Prev</button>
                <button disabled={page*20>=total} onClick={() => setPage(p=>p+1)} className="btn-secondary text-xs py-1.5 px-3 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <PatientDetailPanel patient={selected} onClose={() => closePatient()}
              onUpdate={() => qc.invalidateQueries({ queryKey: ['patients'] })} />
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showModal && <PatientModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
        {showImport && <ImportPatientsModal onClose={() => setShowImport(false)} onSuccess={handleImportSuccess} />}
      </AnimatePresence>
    </div>
  );
}