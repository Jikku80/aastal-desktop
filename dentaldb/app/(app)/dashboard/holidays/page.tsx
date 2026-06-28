'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Bell, Calendar, MapPin, Users, Globe, Trash2, X,
  Sun, Moon, ChevronRight, Megaphone, AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isToday, isFuture, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { noticesApi, branchesApi, usersApi } from '@/lib/api';
import { api } from '@/lib/api';
import Header from '@/components/layout/Header';

// Types
type NoticeType  = 'notice' | 'holiday';
type NoticeScope = 'clinic_wide' | 'branch' | 'team_member';

interface Notice {
  id:              string;
  type:            NoticeType;
  title:           string;
  description?:    string;
  startDate?:      string;
  endDate?:        string;
  scope:           NoticeScope;
  targetBranchIds: string[];
  targetUserIds:   string[];
  createdAt:       string;
  createdBy?:      { firstName: string; lastName: string };
}

interface Branch   { id: string; name: string; isActive?: boolean; }
interface StaffUser { id: string; firstName: string; lastName: string; role: string; }

// ── API helpers ───────────────────────────────────────────────────────────────

const fetchMyNotices = async (type?: string): Promise<Notice[]> => {
  const res = await api.get(`/notices${type ? `?type=${type}` : ''}`);
  const d = res.data;
  return Array.isArray(d) ? d : (d?.data ?? []);
};

const fetchAllNotices = async (type?: string): Promise<Notice[]> => {
  const res = await api.get(`/notices/all${type ? `?type=${type}` : ''}`);
  const d = res.data;
  return Array.isArray(d) ? d : (d?.data ?? []);
};

const fetchBranches = async (): Promise<Branch[]> => {
  const res = await branchesApi.list();
  const d = res.data;
  return Array.isArray(d) ? d : (d?.data ?? []);
};

const fetchStaff = async (): Promise<StaffUser[]> => {
  const res = await usersApi.listStaff({ limit: 200 });
  const d = res.data;
  return Array.isArray(d) ? d : (d?.data ?? []);
};

// ── Scope pill ────────────────────────────────────────────────────────────────

function ScopePill({ scope, targetBranchIds, targetUserIds, branches, staff }: {
  scope:           NoticeScope;
  targetBranchIds: string[];
  targetUserIds:   string[];
  branches:        Branch[];
  staff:           StaffUser[];
}) {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase';
  if (scope === 'clinic_wide') {
    return (
      <span className={`${base} bg-sky-500/10 text-sky-400 dark:text-sky-400 border border-sky-500/20`}>
        <Globe size={10} strokeWidth={2.5} /> Clinic-wide
      </span>
    );
  }
  if (scope === 'branch') {
    const names = (targetBranchIds || []).map(id => branches.find(b => b.id === id)?.name || id).join(', ');
    return (
      <span className={`${base} bg-violet-500/10 text-violet-400 border border-violet-500/20`}>
        <MapPin size={10} strokeWidth={2.5} /> {names || 'Branch'}
      </span>
    );
  }
  const names = (targetUserIds || [])
    .map(id => { const u = staff.find(s => s.id === id); return u ? `${u.firstName} ${u.lastName}` : id; })
    .join(', ');
  return (
    <span className={`${base} bg-amber-500/10 text-amber-400 border border-amber-500/20`}>
      <Users size={10} strokeWidth={2.5} /> {names || 'Team'}
    </span>
  );
}

// ── Notice card ───────────────────────────────────────────────────────────────

function NoticeCard({ notice, branches, staff, onDelete, isAdmin, index }: {
  notice:   Notice;
  branches: Branch[];
  staff:    StaffUser[];
  onDelete: (id: string) => void;
  isAdmin:  boolean;
  index:    number;
}) {
  const isHoliday = notice.type === 'holiday';
  const upcoming  = notice.startDate ? isFuture(parseISO(notice.startDate)) : false;
  const todayItem = notice.startDate ? isToday(parseISO(notice.startDate)) : false;
  const timeAgo   = formatDistanceToNow(parseISO(notice.createdAt), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      {/* Glow accent line */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300 group-hover:opacity-100 opacity-60
        ${isHoliday ? 'bg-gradient-to-b from-orange-400 to-amber-500' : 'bg-gradient-to-b from-sky-400 to-blue-500'}`}
      />

      <div
        className="ml-3 rounded-2xl border transition-all duration-200 overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Subtle top shimmer on hover */}
        <div className={`absolute inset-x-0 top-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300
          ${isHoliday ? 'bg-gradient-to-r from-transparent via-orange-400/40 to-transparent' : 'bg-gradient-to-r from-transparent via-sky-400/40 to-transparent'}`}
        />

        <div className="p-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {/* Type badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase
                  ${isHoliday
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                  {isHoliday ? <Calendar size={10} strokeWidth={2.5} /> : <Megaphone size={10} strokeWidth={2.5} />}
                  {isHoliday ? 'Holiday' : 'Notice'}
                </span>

                <ScopePill
                  scope={notice.scope}
                  targetBranchIds={notice.targetBranchIds || []}
                  targetUserIds={notice.targetUserIds || []}
                  branches={branches}
                  staff={staff}
                />

                {todayItem && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                    <AlertCircle size={10} strokeWidth={2.5} /> Today
                  </span>
                )}
                {upcoming && !todayItem && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Upcoming
                  </span>
                )}
              </div>

              {/* Title */}
              <h3 className="font-semibold text-[var(--text-primary)] text-[15px] leading-snug mb-1.5 tracking-tight">
                {notice.title}
              </h3>

              {/* Description */}
              {notice.description && (
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {notice.description}
                </p>
              )}

              {/* Date range */}
              {isHoliday && notice.startDate && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                  <Calendar size={12} />
                  {format(parseISO(notice.startDate), 'MMM d, yyyy')}
                  {notice.endDate && notice.endDate !== notice.startDate
                    ? <><ChevronRight size={11} />{format(parseISO(notice.endDate), 'MMM d, yyyy')}</>
                    : null}
                </div>
              )}
            </div>

            {/* Delete button */}
            {isAdmin && (
              <button
                onClick={() => onDelete(notice.id)}
                className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-2 rounded-xl hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 flex-shrink-0"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
            {notice.createdBy && (
              <>
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                  {notice.createdBy.firstName[0]}
                </div>
                <span className="text-[12px] text-[var(--text-secondary)] font-medium">
                  {notice.createdBy.firstName} {notice.createdBy.lastName}
                </span>
                <span className="text-[var(--border-hover)]">·</span>
              </>
            )}
            <span className="text-[12px] text-[var(--text-muted)]">{timeAgo}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateNoticeModal({ branches, staff, onClose, onSuccess }: {
  branches:  Branch[];
  staff:     StaffUser[];
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [type,        setType]        = useState<NoticeType>('notice');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [scope,       setScope]       = useState<NoticeScope>('clinic_wide');
  const [selBranches, setSelBranches] = useState<string[]>([]);
  const [selUsers,    setSelUsers]    = useState<string[]>([]);
  const [submitting,  setSubmitting]  = useState(false);

  const toggleBranch = (id: string) =>
    setSelBranches(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleUser = (id: string) =>
    setSelUsers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (scope === 'branch' && selBranches.length === 0) { toast.error('Select at least one branch'); return; }
    if (scope === 'team_member' && selUsers.length === 0) { toast.error('Select at least one team member'); return; }
    setSubmitting(true);
    try {
      await noticesApi.create({
        type, title: title.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        scope,
        targetBranchIds: scope === 'branch'       ? selBranches : [],
        targetUserIds:   scope === 'team_member'   ? selUsers    : [],
      });
      toast.success(`${type === 'holiday' ? 'Holiday' : 'Notice'} created!`);
      onSuccess(); onClose();
    } catch { toast.error('Failed to create. Please try again.'); }
    setSubmitting(false);
  };

  const staffRoles    = ['owner', 'doctor', 'dentist', 'nurse', 'receptionist', 'admin', 'staff', 'accountant'];
  const filteredStaff = staff.filter(u => staffRoles.includes((u.role ?? '').toLowerCase()));
  const activeBranches = branches.filter(b => b.isActive !== false);

  const inputCls = [
    'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    'border focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20',
    'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' ');

  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border-hover)' }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Create announcement</h2>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">Notify your clinic staff instantly</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type toggle */}
          <div className="flex p-1 rounded-2xl gap-1" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            {(['notice', 'holiday'] as const).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold capitalize transition-all duration-200
                  ${type === t
                    ? t === 'holiday'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
                      : 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>
                {t === 'holiday' ? <Calendar size={14} /> : <Megaphone size={14} />}
                {t}
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Title *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder={type === 'holiday' ? 'e.g. Dashain Holiday' : 'e.g. Team meeting this Friday'}
              className={inputCls}
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Details</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Additional context or notes…" rows={3}
              className={`${inputCls} resize-none`}
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }} />
          </div>

          {/* Date range (holidays) */}
          {type === 'holiday' && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Start Date', val: startDate, set: setStartDate, min: '' },
                { label: 'End Date',   val: endDate,   set: setEndDate,   min: startDate },
              ].map(({ label, val, set, min }) => (
                <div key={label} className="space-y-1.5">
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</label>
                  <input type="date" value={val} min={min} onChange={e => set(e.target.value)}
                    className={inputCls}
                    style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', colorScheme: 'dark' }} />
                </div>
              ))}
            </div>
          )}

          {/* Scope */}
          <div className="space-y-2">
            <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Audience</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'clinic_wide' as const,  Icon: Globe,  label: 'Everyone',  color: 'sky' },
                { value: 'branch'      as const,  Icon: MapPin, label: 'Branches',  color: 'violet' },
                { value: 'team_member' as const,  Icon: Users,  label: 'Members',   color: 'amber' },
              ]).map(({ value, Icon, label, color }) => (
                <button key={value} type="button" onClick={() => setScope(value)}
                  className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 text-[12px] font-semibold transition-all duration-200
                    ${scope === value
                      ? color === 'sky'    ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                      : color === 'violet' ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                      :                     'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'}`}>
                  <Icon size={16} strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Branch selector */}
          {scope === 'branch' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2">
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Select Branches
                <span className="ml-2 px-1.5 py-0.5 rounded-md text-violet-400 bg-violet-500/10 text-[10px] normal-case tracking-normal">
                  {selBranches.length} selected
                </span>
              </label>
              <div className="rounded-2xl overflow-hidden max-h-36 overflow-y-auto divide-y divide-[var(--border)]"
                style={{ border: '1px solid var(--border)' }}>
                {activeBranches.map(b => (
                  <label key={b.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]">
                    <div className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center
                      ${selBranches.includes(b.id) ? 'bg-violet-500 border-violet-500' : 'border-[var(--border-hover)]'}`}>
                      {selBranches.includes(b.id) && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" className="sr-only" checked={selBranches.includes(b.id)} onChange={() => toggleBranch(b.id)} />
                    <span className="text-[13px] text-[var(--text-primary)]">{b.name}</span>
                  </label>
                ))}
                {activeBranches.length === 0 && (
                  <p className="text-[13px] text-[var(--text-muted)] text-center py-4">No branches found</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Team member selector */}
          {scope === 'team_member' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2">
              <label className="block text-[12px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Select Members
                <span className="ml-2 px-1.5 py-0.5 rounded-md text-amber-400 bg-amber-500/10 text-[10px] normal-case tracking-normal">
                  {selUsers.length} selected
                </span>
              </label>
              <div className="rounded-2xl overflow-hidden max-h-44 overflow-y-auto divide-y divide-[var(--border)]"
              style={{ border: '1px solid var(--border)' }}>
                {filteredStaff.map(u => (
                  <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-[var(--bg-elevated)]">
                    <div className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center flex-shrink-0
                      ${selUsers.includes(u.id) ? 'bg-amber-500 border-amber-500' : 'border-[var(--border-hover)]'}`}>
                      {selUsers.includes(u.id) && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" className="sr-only" checked={selUsers.includes(u.id)} onChange={() => toggleUser(u.id)} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">{u.firstName} {u.lastName}</div>
                      <div className="text-[11px] text-[var(--text-muted)] capitalize">{u.role}</div>
                    </div>
                  </label>
                ))}
                {filteredStaff.length === 0 && (
                  <p className="text-[13px] text-[var(--text-muted)] text-center py-4">No staff found</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
              style={{ border: '1px solid var(--border)' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting || !title.trim()}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                ${type === 'holiday'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/20'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-lg shadow-sky-500/20'}`}>
              {submitting ? 'Publishing…' : `Publish ${type === 'holiday' ? 'Holiday' : 'Notice'}`}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="ml-3 rounded-2xl p-5 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
        <div className="h-5 w-24 rounded-full" style={{ background: 'var(--bg-elevated)' }} />
      </div>
      <div className="h-4 w-2/3 rounded-lg mb-2" style={{ background: 'var(--bg-elevated)' }} />
      <div className="h-3 w-full rounded-lg mb-1.5" style={{ background: 'var(--bg-elevated)' }} />
      <div className="h-3 w-4/5 rounded-lg" style={{ background: 'var(--bg-elevated)' }} />
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 text-[13px] font-semibold rounded-xl transition-all duration-200 relative
        ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>
      {children}
      {active && (
        <motion.div layoutId="activeTab"
          className="absolute inset-0 rounded-xl -z-10"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
        />
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NoticeHolidayPage() {
  const qc = useQueryClient();

  const [activeTab,   setActiveTab]   = useState<'all' | 'notice' | 'holiday'>('all');
  const [showCreate,  setShowCreate]  = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);

  const isAdmin    = true;
  const typeFilter = activeTab === 'all' ? undefined : activeTab;

  const { data: notices = [], isLoading, refetch } = useQuery<Notice[]>({
    queryKey:        ['notices', activeTab, isAdminView],
    queryFn:         () => isAdminView ? fetchAllNotices(typeFilter) : fetchMyNotices(typeFilter),
    refetchInterval: 60_000,
  });

  const { data: branches = [] } = useQuery<Branch[]>({ queryKey: ['branches'], queryFn: fetchBranches });
  const { data: staff    = [] } = useQuery<StaffUser[]>({ queryKey: ['staff'],    queryFn: fetchStaff });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => noticesApi.delete(id),
    onSuccess:  () => { toast.success('Deleted'); refetch(); },
    onError:    () => toast.error('Delete failed'),
  });

  const handleDelete = (id: string) => { if (confirm('Delete this notice?')) deleteMutation.mutate(id); };

  const upcomingHolidays = notices.filter(
    n => n.type === 'holiday' && n.startDate && (isFuture(parseISO(n.startDate)) || isToday(parseISO(n.startDate)))
  );

  const noticeCount  = notices.filter(n => n.type === 'notice').length;
  const holidayCount = notices.filter(n => n.type === 'holiday').length;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ── Sticky header ── */}
      <Header
        title="Notices & Holidays"
        subtitle={'Announcements'}
        action={isAdmin ? {
          label: 'New Notice',
          icon: Plus,
          onClick: () => setShowCreate(true),
        } : undefined}
      />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 space-y-6">

        {/* ── Stat chips + admin toggle ── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Bell size={12} className="text-sky-400" />
              <span className="text-[var(--text-primary)] font-bold">{noticeCount}</span> Notice{noticeCount !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <Calendar size={12} className="text-orange-400" />
              <span className="text-[var(--text-primary)] font-bold">{holidayCount}</span> Holiday{holidayCount !== 1 ? 's' : ''}
            </div>
          </div>

          {isAdmin && (
            <button onClick={() => setIsAdminView(!isAdminView)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200
                ${isAdminView
                  ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-hover)]'}`}
              style={!isAdminView ? { background: 'var(--bg-surface)' } : {}}>
              {isAdminView ? '👑' : '👤'} {isAdminView ? 'Admin view' : 'My view'}
            </button>
          )}
        </div>

        {/* ── Upcoming holidays banner ── */}
        <AnimatePresence>
          {upcomingHolidays.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl overflow-hidden"
              style={{ border: '1px solid rgba(251,146,60,0.25)' }}
            >
              {/* Header bar */}
              <div className="flex items-center gap-2.5 px-5 py-3"
                style={{ background: 'rgba(251,146,60,0.08)', borderBottom: '1px solid rgba(251,146,60,0.15)' }}>
                <div className="w-6 h-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Calendar size={13} className="text-orange-400" />
                </div>
                <span className="text-[13px] font-bold text-orange-400 tracking-wide">Upcoming Holidays</span>
                <span className="ml-auto px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[11px] font-bold">
                  {upcomingHolidays.length}
                </span>
              </div>
              {/* Pills */}
              <div className="flex flex-wrap gap-2 px-5 py-3" style={{ background: 'var(--bg-surface)' }}>
                {upcomingHolidays.map(h => (
                  <div key={h.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[12px]"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <span className="font-semibold text-[var(--text-primary)]">{h.title}</span>
                    {h.startDate && (
                      <span className="text-[var(--text-muted)]">
                        {format(parseISO(h.startDate), 'MMM d')}
                        {h.endDate && h.endDate !== h.startDate ? ` – ${format(parseISO(h.endDate), 'MMM d')}` : ''}
                      </span>
                    )}
                    {isToday(parseISO(h.startDate!)) && (
                      <span className="px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[10px] font-bold uppercase tracking-wide">Today</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 p-1 rounded-2xl w-fit"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <TabButton active={activeTab === 'all'}     onClick={() => setActiveTab('all')}>All</TabButton>
          <TabButton active={activeTab === 'notice'}  onClick={() => setActiveTab('notice')}>🔔 Notices</TabButton>
          <TabButton active={activeTab === 'holiday'} onClick={() => setActiveTab('holiday')}>📅 Holidays</TabButton>
        </div>

        {/* ── List ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : notices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 rounded-3xl"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 flex items-center justify-center mx-auto mb-4 border border-sky-500/20">
              <Bell size={22} className="text-sky-400" />
            </div>
            <p className="font-semibold text-[var(--text-primary)] text-[15px] mb-1">No announcements yet</p>
            <p className="text-[13px] text-[var(--text-muted)] mb-5">
              {activeTab === 'all' ? 'Notices and holidays will appear here' : `No ${activeTab}s to show`}
            </p>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-400 text-[13px] font-semibold hover:bg-sky-500/15 transition-colors">
                <Plus size={15} /> Create one
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {notices.map((n, i) => (
                <NoticeCard
                  key={n.id} notice={n} index={i}
                  branches={branches} staff={staff}
                  onDelete={handleDelete} isAdmin={isAdmin}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Create modal ── */}
      <AnimatePresence>
        {showCreate && (
          <CreateNoticeModal
            branches={branches} staff={staff}
            onClose={() => setShowCreate(false)}
            onSuccess={() => { refetch(); qc.invalidateQueries({ queryKey: ['notices'] }); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}