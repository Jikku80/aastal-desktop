'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';
import { Search, Building2, ChevronLeft, ChevronRight, Trash2, User } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const ROLE_STYLES: Record<string, string> = {
  super_admin:  'bg-red-500/10 text-red-400 border-red-500/20',
  owner:        'bg-amber-500/10 text-amber-400 border-amber-500/20',
  dentist:      'bg-brand-500/10 text-brand-400 border-brand-500/20',
  receptionist: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  accountant:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
  staff:        'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

const ROLES = ['', 'super_admin', 'owner', 'dentist', 'receptionist', 'accountant', 'staff'];

function DeleteConfirmModal({ user, onConfirm, onCancel, isPending }: {
  user: any; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-[95] modal-clearance flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="rounded-2xl p-6 w-full max-w-sm shadow-xl" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={20} className="text-red-400" />
        </div>
        <h3 className="text-base font-bold text-[var(--text-primary)] text-center mb-1">Delete User</h3>
        <p className="text-sm text-[var(--text-muted)] text-center mb-5">
          Permanently delete <strong className="text-[var(--text-primary)]">{user.firstName} {user.lastName}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={isPending} className="flex-1 btn-ghost py-2 text-sm">Cancel</button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60">
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [search, setSearch]           = useState('');
  const [role,   setRole]             = useState('');
  const [page,   setPage]             = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const limit = 20;
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn:  () => adminApi.getUsers({ search, role, page, limit }).then(r => r.data),
    placeholderData: (prev: any) => prev,
  }) as { data: any; isLoading: boolean };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const users      = data?.data || [];
  const total      = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={deleteMutation.isPending}
        />
      )}

      <div>
        <h1 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">User Management</h1>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5">All users across all clinics ({total} total)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email…" className="input pl-8 w-full text-sm" />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
          className="input text-sm w-full sm:w-44">
          {ROLES.map(r => (
            <option key={r} value={r}>
              {r ? r.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All Roles'}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide hidden md:table-cell">Clinic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded animate-pulse" style={{ background: 'var(--bg-elevated)', width: j === 0 ? '160px' : '80px' }} />
                    </td>
                  ))}
                </tr>
              )) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)] text-sm">No users found</td></tr>
              ) : users.map((user: any) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  className="hover:bg-[var(--bg-elevated)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                        <span className="text-brand-400 text-xs font-bold">{user.firstName?.[0]}{user.lastName?.[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${ROLE_STYLES[user.role] || ROLE_STYLES.staff}`}>
                      {user.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-[var(--text-muted)] shrink-0" />
                      <span className="text-xs text-[var(--text-secondary)] truncate max-w-[140px]">{user.clinic?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-[var(--text-muted)]">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role !== 'super_admin' && (
                      <button onClick={() => setDeleteTarget(user)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all"
                        title="Delete user">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages} · {total} users</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-ghost w-8 h-8 p-0 justify-center disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-ghost w-8 h-8 p-0 justify-center disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {isLoading ? Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', height: 80 }} />
        )) : users.length === 0 ? (
          <div className="text-center py-12">
            <User size={28} className="mx-auto text-[var(--text-muted)] opacity-30 mb-3" />
            <p className="text-sm text-[var(--text-muted)]">No users found</p>
          </div>
        ) : users.map((user: any) => (
          <div key={user.id} className="rounded-2xl p-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                  <span className="text-brand-400 text-xs font-bold">{user.firstName?.[0]}{user.lastName?.[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--text-primary)] text-sm truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">{user.email}</p>
                </div>
              </div>
              {user.role !== 'super_admin' && (
                <button onClick={() => setDeleteTarget(user)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-all shrink-0">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize border ${ROLE_STYLES[user.role] || ROLE_STYLES.staff}`}>
                {user.role?.replace('_', ' ')}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${user.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              {user.clinic?.name && (
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <Building2 size={9} />{user.clinic.name}
                </span>
              )}
            </div>
          </div>
        ))}
        {/* Mobile pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-[var(--text-muted)]">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">← Prev</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
