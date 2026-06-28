'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import Header from '@/components/layout/Header';
import { format } from 'date-fns';
import {
  ShieldCheck, ChevronDown, ChevronRight, Download,
  LogIn, FilePlus, Pencil, Trash2, FileDown, Layers, AlertTriangle,
  Loader2, Search, X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  clinicId: string;
  userId?: string;
  user?: { id: string; firstName: string; lastName: string; email: string; avatar?: string };
  action: 'created' | 'updated' | 'deleted' | 'login' | 'export' | 'bulk';
  entityType: string;
  entityId?: string;
  changes?: { before?: Record<string, any>; after?: Record<string, any> } | null;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ACTION_META: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  created: { label: 'Created', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: FilePlus  },
  updated: { label: 'Updated', color: 'text-blue-400',    bg: 'bg-blue-500/10',    icon: Pencil    },
  deleted: { label: 'Deleted', color: 'text-red-400',     bg: 'bg-red-500/10',     icon: Trash2    },
  login:   { label: 'Login',   color: 'text-brand-400',   bg: 'bg-brand-500/10',   icon: LogIn     },
  export:  { label: 'Export',  color: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: FileDown  },
  bulk:    { label: 'Bulk',    color: 'text-purple-400',  bg: 'bg-purple-500/10',  icon: Layers    },
};

const ENTITY_TYPES = [
  'invoice', 'patient', 'appointment', 'user', 'prescription',
  'clinical_record', 'product', 'recall', 'auth', 'purchase_order',
];

const ENTITY_LINKS: Record<string, (id: string) => string> = {
  invoice:     id => `/dashboard/billing`,
  patient:     id => `/dashboard/patients/${id}`,
  appointment: id => `/dashboard/appointments`,
  user:        id => `/dashboard/staff`,
  product:     id => `/dashboard/inventory`,
};

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ user }: { user?: AuditLog['user'] }) {
  if (!user) return (
    <div className="w-7 h-7 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
      <span className="text-[10px] text-[var(--text-muted)]">?</span>
    </div>
  );
  return user.avatar
    ? <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
    : (
      <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center shrink-0">
        <span className="text-[10px] font-semibold text-brand-400">
          {user.firstName[0]}{user.lastName[0]}
        </span>
      </div>
    );
}

// ── Diff viewer ───────────────────────────────────────────────────────────────
function DiffRow({ before, after }: { before?: Record<string, any>; after?: Record<string, any> }) {
  const allKeys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  if (!allKeys.length) return <p className="text-xs text-[var(--text-muted)] italic">No field changes recorded.</p>;

  return (
    <div className="overflow-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
            <th className="text-left px-3 py-2 text-[var(--text-muted)] font-semibold uppercase tracking-wider w-1/4">Field</th>
            <th className="text-left px-3 py-2 text-red-400 font-semibold uppercase tracking-wider w-[37.5%]">Before</th>
            <th className="text-left px-3 py-2 text-emerald-400 font-semibold uppercase tracking-wider w-[37.5%]">After</th>
          </tr>
        </thead>
        <tbody>
          {allKeys.map(key => (
            <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="px-3 py-1.5 font-mono text-[var(--text-muted)]">{key}</td>
              <td className="px-3 py-1.5 font-mono max-w-0">
                {before?.[key] !== undefined ? (
                  <span className="block truncate text-red-300/80 bg-red-500/5 px-1.5 py-0.5 rounded">
                    {JSON.stringify(before[key])}
                  </span>
                ) : <span className="text-[var(--text-muted)]">—</span>}
              </td>
              <td className="px-3 py-1.5 font-mono max-w-0">
                {after?.[key] !== undefined ? (
                  <span className="block truncate text-emerald-300/80 bg-emerald-500/5 px-1.5 py-0.5 rounded">
                    {JSON.stringify(after[key])}
                  </span>
                ) : <span className="text-[var(--text-muted)]">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function AuditRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();
  const meta = ACTION_META[log.action] ?? ACTION_META.updated;
  const Icon = meta.icon;
  const hasChanges = log.changes && (
    Object.keys(log.changes.before ?? {}).length > 0 ||
    Object.keys(log.changes.after  ?? {}).length > 0
  );
  const entityLink = ENTITY_LINKS[log.entityType];

  return (
    <>
      <tr
        className="hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer"
        style={{ borderBottom: expanded ? 'none' : '1px solid var(--border)' }}
        onClick={() => hasChanges && setExpanded(v => !v)}
      >
        {/* Timestamp */}
        <td className="px-4 py-3 whitespace-nowrap">
          <p className="text-xs text-[var(--text-primary)]">{format(new Date(log.createdAt), 'MMM d, yyyy')}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{format(new Date(log.createdAt), 'HH:mm:ss')}</p>
        </td>

        {/* User */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <Avatar user={log.user} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{log.user?.email ?? ''}</p>
            </div>
          </div>
        </td>

        {/* Action */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${meta.color} ${meta.bg}`}>
            <Icon size={11} />
            {meta.label}
          </span>
        </td>

        {/* Entity type */}
        <td className="px-4 py-3 hidden md:table-cell">
          <span className="text-xs text-[var(--text-primary)] capitalize">
            {log.entityType.replace(/_/g, ' ')}
          </span>
        </td>

        {/* Entity ID */}
        <td className="px-4 py-3 hidden md:table-cell">
          {log.entityId ? (
            entityLink ? (
              <button
                onClick={e => { e.stopPropagation(); router.push(entityLink(log.entityId!)); }}
                className="text-xs text-brand-400 hover:underline font-mono truncate max-w-[120px] block"
              >
                {log.entityId.slice(0, 8)}…
              </button>
            ) : (
              <span className="text-xs text-[var(--text-muted)] font-mono">{log.entityId.slice(0, 8)}…</span>
            )
          ) : <span className="text-[var(--text-muted)]">—</span>}
        </td>

        {/* IP */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="text-xs text-[var(--text-muted)] font-mono">{log.ipAddress ?? '—'}</span>
        </td>

        {/* Expand toggle */}
        <td className="px-4 py-3">
          {hasChanges ? (
            <button className="btn-ghost w-7 h-7 p-0 justify-center" onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}>
              {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : null}
        </td>
      </tr>

      {/* Expanded diff */}
      {expanded && hasChanges && (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <td colSpan={7} className="px-4 pb-4 pt-2 bg-[var(--bg-elevated)]">
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Changes</p>
            <DiffRow before={log.changes?.before} after={log.changes?.after} />
            {log.userAgent && (
              <p className="text-[10px] text-[var(--text-muted)] mt-2 italic truncate">UA: {log.userAgent}</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCsv(logs: AuditLog[]) {
  const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'Entity ID', 'IP Address'];
  const rows = logs.map(l => [
    format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System',
    l.user?.email ?? '',
    l.action,
    l.entityType,
    l.entityId ?? '',
    l.ipAddress ?? '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const { user } = useAuthStore();
  const router   = useRouter();

  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [entityType, setEntityType] = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');

  // Owner-only guard
  if (user && user.role !== 'owner' && user.role !== 'super_admin') {
    return (
      <div className="flex flex-col h-screen items-center justify-center gap-3">
        <AlertTriangle size={40} className="text-amber-400" />
        <p className="text-[var(--text-primary)] font-semibold">Access restricted to owners only.</p>
        <button onClick={() => router.back()} className="btn-ghost">Go back</button>
      </div>
    );
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', page, entityType, startDate, endDate],
    queryFn: () => auditApi.list({ page, limit: 50, entityType: entityType || undefined, startDate: startDate || undefined, endDate: endDate || undefined }).then(r => r.data as { data: AuditLog[]; total: number; page: number; limit: number }),
    placeholderData: prev => prev,
  });

  const logs  = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  // Client-side user filter (text search on name/email)
  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(l =>
      l.user?.firstName.toLowerCase().includes(q) ||
      l.user?.lastName.toLowerCase().includes(q) ||
      l.user?.email.toLowerCase().includes(q) ||
      l.entityId?.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const clearFilters = () => { setEntityType(''); setStartDate(''); setEndDate(''); setSearch(''); setPage(1); };
  const hasFilters = !!(entityType || startDate || endDate || search);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Audit Log"
        action={{
          label: 'Export CSV',
          onClick: () => exportCsv(filtered),
          icon: Download,
        }}
      />

      <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {[
            { label: 'Total Events',  value: total },
            { label: 'Logins',        value: logs.filter(l => l.action === 'login').length },
            { label: 'Changes',       value: logs.filter(l => l.action === 'updated').length },
            { label: 'Deletions',     value: logs.filter(l => l.action === 'deleted').length },
          ].map(c => (
            <div key={c.label} className="rounded-xl p-3 sm:p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">{c.label}</p>
              <p className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1">{c.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
          <div className="relative flex-1 sm:flex-none">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search user or entity ID…"
              className="input pl-8 w-full sm:w-56 h-9 text-sm"
            />
          </div>

          <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}
            className="input h-9 text-sm flex-1 sm:flex-none">
            <option value="">All entity types</option>
            {ENTITY_TYPES.map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <div className="flex gap-2 flex-1 sm:flex-none">
            <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
              className="input h-9 text-sm flex-1 sm:flex-none" placeholder="Start date" />
            <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
              className="input h-9 text-sm flex-1 sm:flex-none" placeholder="End date" />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost h-9 px-3 gap-1.5 text-sm text-[var(--text-muted)]">
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 size={24} className="animate-spin mx-auto text-[var(--text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <ShieldCheck size={40} className="mx-auto text-[var(--text-muted)] mb-3 opacity-30" />
              <p className="text-sm text-[var(--text-muted)]">No audit logs found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Entity Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap hidden md:table-cell">Entity ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">IP Address</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => <AuditRow key={log.id} log={log} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-[var(--text-muted)]">
              Page {page} of {totalPages} · {total.toLocaleString()} total events
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-ghost h-8 px-3 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-ghost h-8 px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}

        {isFetching && !isLoading && (
          <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)]"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <Loader2 size={13} className="animate-spin" /> Loading…
          </div>
        )}
      </div>
    </div>
  );
}
