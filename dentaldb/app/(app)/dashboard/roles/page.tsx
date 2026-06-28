'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Plus, Trash2, Edit2, Check, X, ChevronDown, ChevronUp,
  Loader2, Lock, Search, Sparkles,
  CheckSquare, Square, Info, AlertTriangle,
} from 'lucide-react';
import { usePermissions } from '@/store/permissions.store';
import PermissionGate from '@/components/rbac/PermissionGate';
import { rbacApi } from '@/lib/api';
import Header from '@/components/layout/Header';

interface Permission { id: string; key: string; label: string; group: string; }
interface Role { id: string; name: string; description?: string; isSystem: boolean; permissions: Permission[]; }

function groupPermissions(permissions: Permission[]): Record<string, Permission[]> {
  return permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.group] = acc[p.group] ?? []).push(p);
    return acc;
  }, {});
}

const GROUP_ICONS: Record<string, string> = {
  Dashboard: '⊞', Appointments: '📅', Patients: '👤', Billing: '💳',
  Analytics: '📊', Staff: '👥', Branches: '🏢', HR: '🗂️',
  Website: '🌐', Settings: '⚙️', 'Access Control': '🔐', Records: '📁', Inventory: '📦',
  Services: '🩺',
};

const GROUP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Dashboard:        { bg: 'bg-blue-500/8',    text: 'text-blue-400',    border: 'border-blue-500/20'   },
  Appointments:     { bg: 'bg-brand-500/8',   text: 'text-brand-400',   border: 'border-brand-500/20'  },
  Patients:         { bg: 'bg-emerald-500/8', text: 'text-emerald-400', border: 'border-emerald-500/20'},
  Billing:          { bg: 'bg-amber-500/8',   text: 'text-amber-400',   border: 'border-amber-500/20'  },
  Analytics:        { bg: 'bg-violet-500/8',  text: 'text-violet-400',  border: 'border-violet-500/20' },
  Staff:            { bg: 'bg-pink-500/8',    text: 'text-pink-400',    border: 'border-pink-500/20'   },
  Branches:         { bg: 'bg-indigo-500/8',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
  HR:               { bg: 'bg-orange-500/8',  text: 'text-orange-400',  border: 'border-orange-500/20' },
  Website:          { bg: 'bg-teal-500/8',    text: 'text-teal-400',    border: 'border-teal-500/20'   },
  Settings:         { bg: 'bg-gray-500/8',    text: 'text-gray-400',    border: 'border-gray-500/20'   },
  'Access Control': { bg: 'bg-red-500/8',     text: 'text-red-400',     border: 'border-red-500/20'    },
  Records:          { bg: 'bg-cyan-500/8',    text: 'text-cyan-400',    border: 'border-cyan-500/20'   },
  Inventory:        { bg: 'bg-lime-500/8',    text: 'text-lime-400',    border: 'border-lime-500/20'   },
  Services:         { bg: 'bg-sky-500/8',     text: 'text-sky-400',     border: 'border-sky-500/20'    },
};

function getGroupStyle(group: string) {
  return GROUP_COLORS[group] ?? { bg: 'bg-gray-500/8', text: 'text-gray-400', border: 'border-gray-500/20' };
}

// ── Permission Toggle ─────────────────────────────────────────────────────────
function PermToggle({
  perm, enabled, disabled, onToggle,
}: { perm: Permission; enabled: boolean; disabled: boolean; onToggle: (id: string, val: boolean) => void }) {
  const [optimistic, setOptimistic] = useState(enabled);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setOptimistic(enabled); }, [enabled]);

  const handle = async () => {
    if (disabled || busy) return;
    const next = !optimistic;
    setOptimistic(next);
    setBusy(true);
    try { await onToggle(perm.id, next); }
    catch { setOptimistic(!next); }
    finally { setBusy(false); }
  };

  return (
    <button
      onClick={handle}
      disabled={disabled}
      className={[
        'group flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 w-full',
        disabled ? 'cursor-default opacity-60' : 'cursor-pointer hover:scale-[1.01]',
        optimistic
          ? 'border-brand-500/40 bg-brand-500/8 shadow-sm shadow-brand-500/10'
          : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)]',
      ].join(' ')}
    >
      <div className={[
        'mt-0.5 w-4 h-4 rounded-[5px] flex items-center justify-center shrink-0 transition-all duration-150 border',
        optimistic ? 'bg-brand-600 border-brand-600' : 'border-[var(--border)] bg-[var(--bg-base)]',
      ].join(' ')}>
        {busy
          ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" />
          : optimistic && <Check className="w-2.5 h-2.5 text-white" />
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium truncate transition-colors ${optimistic ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
          {perm.label}
        </p>
        <p className="text-[10px] text-[var(--text-muted)] font-mono truncate mt-0.5">{perm.key}</p>
      </div>
    </button>
  );
}

// ── Role Card ─────────────────────────────────────────────────────────────────
function RoleCard({
  role, allPermissions, canManage, onUpdate, onDelete, onToggle,
}: {
  role: Role; allPermissions: Permission[]; canManage: boolean;
  onUpdate: (id: string, name: string, desc: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (roleId: string, permId: string, enabled: boolean) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description ?? '');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const rolePermIds = new Set(role.permissions.map(p => p.id));
  const grouped = groupPermissions(allPermissions);

  const filteredGroups = Object.entries(grouped).reduce<Record<string, Permission[]>>((acc, [g, perms]) => {
    const filtered = search
      ? perms.filter(p => p.label.toLowerCase().includes(search.toLowerCase()) || p.key.toLowerCase().includes(search.toLowerCase()))
      : perms;
    if (filtered.length) acc[g] = filtered;
    return acc;
  }, {});

  const totalEnabled = role.permissions.length;
  const totalPerms = allPermissions.length;
  const pct = totalPerms ? Math.round((totalEnabled / totalPerms) * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    try { await onUpdate(role.id, name, description); setEditing(false); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete role "${role.name}"? All user assignments will be removed.`)) return;
    await onDelete(role.id);
  };

  const handleSelectAll = async (group: string) => {
    const groupPerms = grouped[group] ?? [];
    const allEnabled = groupPerms.every(p => rolePermIds.has(p.id));
    for (const p of groupPerms) {
      const shouldEnable = !allEnabled;
      if (rolePermIds.has(p.id) !== shouldEnable) {
        await onToggle(role.id, p.id, shouldEnable);
      }
    }
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all duration-200 ${
      expanded
        ? 'border-brand-500/30 shadow-lg shadow-brand-500/5'
        : 'border-[var(--border)] hover:border-[var(--border-hover)]'
    }`} style={{ background: 'var(--bg-surface)' }}>

      {/* Header */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
        {/* Progress ring - hidden on very small, shown sm+ */}
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 shrink-0 hidden xs:block sm:block">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-[var(--border)]" />
            <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray={`${2 * Math.PI * 18}`}
              strokeDashoffset={`${2 * Math.PI * 18 * (1 - pct / 100)}`}
              strokeLinecap="round"
              className="text-brand-500 transition-all duration-500" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-400" />
          </div>
        </div>
        {/* Shield icon fallback for xs */}
        <div className="relative w-9 h-9 shrink-0 flex sm:hidden items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
          <Shield className="w-5 h-5 text-brand-400" />
        </div>

        {/* Name / edit */}
        {editing ? (
          <div className="flex-1 space-y-2 min-w-0">
            <input
              className="input w-full text-sm font-semibold"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Role name" autoFocus
            />
            <input
              className="input w-full text-xs"
              value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[var(--text-primary)]">{role.name}</span>
              {role.isSystem && (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400 border border-amber-500/20 font-medium">
                  <Lock className="w-2.5 h-2.5" /> System
                </span>
              )}
            </div>
            {role.description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{role.description}</p>
            )}
            {/* Progress bar + stats */}
            <div className="flex items-center gap-2 sm:gap-3 mt-1.5 flex-wrap">
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-16 sm:w-20 rounded-full overflow-hidden bg-[var(--border)]">
                  <div className="h-full bg-brand-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-[var(--text-muted)]">{totalEnabled}/{totalPerms}</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">{pct}% access</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {canManage && !role.isSystem && (
            editing ? (
              <>
                <button onClick={handleSave} disabled={saving}
                  className="p-2 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Save">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                </button>
                <button onClick={() => { setEditing(false); setName(role.name); setDescription(role.description ?? ''); }}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] transition-colors" title="Cancel">
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors" title="Edit role">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={handleDelete}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete role">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className={`p-2 rounded-xl transition-all duration-200 ${expanded ? 'bg-brand-500/10 text-brand-400' : 'text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]'}`}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Permission matrix */}
      {expanded && (
        <div className="border-t border-[var(--border)]">
          {/* Search + lock indicator */}
          <div className="flex items-center gap-2 px-4 sm:px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter permissions…"
                className="input w-full text-xs py-2"
                style={{ paddingLeft: '2rem' }}
              />
            </div>
            {search && (
              <button onClick={() => setSearch('')} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {role.isSystem && (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 shrink-0">
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Locked</span>
              </span>
            )}
          </div>

          {/* Permission groups */}
          <div className="p-4 sm:p-5 space-y-5 sm:space-y-6">
            {Object.entries(filteredGroups).map(([group, perms]) => {
              const style = getGroupStyle(group);
              const allEnabled = perms.every(p => rolePermIds.has(p.id));
              const someEnabled = perms.some(p => rolePermIds.has(p.id));
              return (
                <div key={group}>
                  {/* Group header */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1 sm:gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 sm:px-2.5 py-1 rounded-lg border ${style.bg} ${style.text} ${style.border} shrink-0`}>
                        <span className="text-sm leading-none">{GROUP_ICONS[group] ?? '•'}</span>
                        <span className="hidden xs:inline sm:inline">{group}</span>
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] shrink-0">
                        {perms.filter(p => rolePermIds.has(p.id)).length}/{perms.length}
                      </span>
                    </div>
                    {canManage && !role.isSystem && (
                      <button
                        onClick={() => handleSelectAll(group)}
                        className={`flex items-center gap-1 sm:gap-1.5 text-[10px] px-2 py-1 rounded-lg transition-colors font-medium shrink-0 ${
                          allEnabled
                            ? 'text-red-400 hover:bg-red-500/10'
                            : 'text-brand-400 hover:bg-brand-500/10'
                        }`}>
                        {allEnabled
                          ? <><CheckSquare className="w-3 h-3" /><span className="hidden sm:inline"> Deselect all</span><span className="sm:hidden">None</span></>
                          : <><Square className="w-3 h-3" /><span className="hidden sm:inline"> Select all</span><span className="sm:hidden">All</span></>
                        }
                      </button>
                    )}
                  </div>

                  {/* Permission toggles grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {perms.map(perm => (
                      <PermToggle
                        key={perm.id} perm={perm}
                        enabled={rolePermIds.has(perm.id)}
                        disabled={!canManage || role.isSystem}
                        onToggle={(permId, val) => onToggle(role.id, permId, val)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {Object.keys(filteredGroups).length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center py-6">No permissions match your search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Create Role Form ──────────────────────────────────────────────────────────
function CreateRoleForm({ onDone, onCreate }: { onDone: () => void; onCreate: (name: string, desc: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try { await onCreate(name.trim(), desc.trim()); onDone(); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="rounded-2xl border border-brand-500/30 bg-brand-500/5 p-4 sm:p-5 space-y-4">
      <div className="flex items-start sm:items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-[var(--text-primary)]">Create New Role</h3>
          <p className="text-xs text-[var(--text-muted)]">Define a role then configure its permissions below.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          className="input w-full"
          placeholder="Role name (e.g. Nurse, Lab Tech)"
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handle()}
          autoFocus
        />
        <input
          className="input w-full"
          placeholder="Description (optional)"
          value={desc} onChange={e => setDesc(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handle} disabled={!name.trim() || submitting} className="btn-primary text-sm">
          {submitting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><Plus className="w-4 h-4" /> Create Role</>
          }
        </button>
        <button onClick={onDone} className="btn-secondary text-sm">Cancel</button>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ canManage, onNew }: { canManage: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-3xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center mb-5 sm:mb-6">
        <Shield className="w-8 h-8 sm:w-9 sm:h-9 text-brand-400 opacity-60" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-2">No roles yet</h3>
      <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6">
        Create roles like "Nurse" or "Lab Technician" and configure exactly which parts of the system they can access.
      </p>
      {canManage && (
        <button onClick={onNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Create first role
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RolesPage() {
  const { can } = usePermissions();
  const canManage = can('roles.manage');

  const [roles,        setRoles]        = useState<Role[]>([]);
  const [permissions,  setPermissions]  = useState<Permission[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [creating,     setCreating]     = useState(false);
  const [error,        setError]        = useState('');
  const [globalSearch, setGlobalSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rbacApi.getRoles(),
        rbacApi.getAllPermissions(),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch {
      setError('Failed to load roles. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (name: string, description: string) => {
    setError('');
    try {
      const { data } = await rbacApi.createRole({ name, description: description || undefined });
      setRoles(prev => [...prev, { ...data, permissions: [] }]);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create role.');
      throw e;
    }
  };

  const handleUpdate = async (id: string, name: string, description: string) => {
    const { data } = await rbacApi.updateRole(id, { name, description });
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
  };

  const handleDelete = async (id: string) => {
    await rbacApi.deleteRole(id);
    setRoles(prev => prev.filter(r => r.id !== id));
  };

  const handleToggle = async (roleId: string, permissionId: string, enabled: boolean) => {
    const { data } = await rbacApi.togglePermission(roleId, permissionId, enabled);
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, permissions: data.permissions } : r));
  };

  const filteredRoles = globalSearch
    ? roles.filter(r =>
        r.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
        r.description?.toLowerCase().includes(globalSearch.toLowerCase())
      )
    : roles;

  const totalPerms = permissions.length;

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="Roles & Permissions" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* Page intro — stacks on mobile */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-sm text-[var(--text-muted)] max-w-md">
              Create roles and configure which permissions each role has. Assign roles to staff members on the Staff page.
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Stats pill */}
              <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] text-xs text-[var(--text-muted)]">
                <span><strong className="text-[var(--text-primary)]">{roles.length}</strong> roles</span>
                <span className="w-px h-3 bg-[var(--border)]" />
                <span><strong className="text-[var(--text-primary)]">{totalPerms}</strong> perms</span>
              </div>
              <PermissionGate permission="roles.manage">
                <button onClick={() => setCreating(true)} className="btn-primary text-sm whitespace-nowrap">
                  <Plus className="w-4 h-4" />
                  <span className="hidden xs:inline sm:inline">New Role</span>
                </button>
              </PermissionGate>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-red-500/8 border border-red-500/20 text-red-400 text-sm">
              <div className="flex items-start sm:items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="shrink-0 p-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Create form */}
          {creating && (
            <CreateRoleForm onDone={() => setCreating(false)} onCreate={handleCreate} />
          )}

          {/* Global search */}
          {roles.length > 0 && (
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
              <input
                value={globalSearch} onChange={e => setGlobalSearch(e.target.value)}
                placeholder="Search roles…"
                className="input w-full"
                style={{ paddingLeft: '2.5rem' }}
              />
              {globalSearch && (
                <button
                  onClick={() => setGlobalSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Roles list */}
          {loading ? (
            <div className="space-y-3 sm:space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 sm:h-24 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] animate-pulse" />
              ))}
            </div>
          ) : filteredRoles.length === 0 ? (
            roles.length === 0
              ? <EmptyState canManage={canManage} onNew={() => setCreating(true)} />
              : <p className="text-center text-sm text-[var(--text-muted)] py-10">No roles match "{globalSearch}"</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredRoles.map(role => (
                <RoleCard
                  key={role.id} role={role} allPermissions={permissions}
                  canManage={canManage}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          )}

          {/* Info footer */}
          {!loading && roles.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]">
              <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5 hidden sm:block" />
              <div className="flex-1">
                <div className="flex items-start gap-2 sm:gap-0">
                  <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5 sm:hidden" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text-primary)] mb-0.5">How permissions work</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      When a staff member logs in, the system combines all permissions from their assigned roles. Use the <strong className="text-[var(--text-secondary)]">🛡️ icon</strong> on the Staff page to assign roles to individual members.
                    </p>
                  </div>
                </div>
              </div>
              <a href="/dashboard/staff" className="btn-secondary text-xs whitespace-nowrap self-start sm:self-auto shrink-0">
                Go to Staff →
              </a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}