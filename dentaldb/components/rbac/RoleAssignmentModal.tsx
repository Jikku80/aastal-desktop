'use client';
/**
 * RoleAssignmentModal — pick and assign roles to a staff member.
 *
 * Drop into the Staff page:
 *
 *   const [assignTarget, setAssignTarget] = useState<User | null>(null);
 *
 *   // In table row:
 *   <button onClick={() => setAssignTarget(member)}>Assign Roles</button>
 *
 *   // In JSX:
 *   {assignTarget && (
 *     <RoleAssignmentModal
 *       user={assignTarget}
 *       onClose={() => setAssignTarget(null)}
 *       onSaved={() => { setAssignTarget(null); refetch(); }}
 *     />
 *   )}
 */
import { useState, useEffect } from 'react';
import { X, Shield, Check, Loader2 } from 'lucide-react';
import { rbacApi } from '@/lib/api';

interface RoleInfo {
  id:          string;
  name:        string;
  description?: string;
  permissions: { id: string; key: string }[];
}

interface UserInfo {
  id:        string;
  firstName: string;
  lastName:  string;
  email:     string;
}

interface Props {
  user:    UserInfo;
  onClose: () => void;
  onSaved: () => void;
}

export default function RoleAssignmentModal({ user, onClose, onSaved }: Props) {
  const [allRoles,    setAllRoles]    = useState<RoleInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [rolesRes, userRolesRes] = await Promise.all([
          rbacApi.getRoles(),
          rbacApi.getUserRoles(user.id),
        ]);
        setAllRoles(rolesRes.data);
        const currentIds = new Set<string>(
          (userRolesRes.data as { roleId: string }[]).map((ur) => ur.roleId),
        );
        setSelectedIds(currentIds);
      } catch {
        setError('Failed to load roles.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user.id]);

  const toggle = (roleId: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(roleId) ? next.delete(roleId) : next.add(roleId);
      return next;
    });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await rbacApi.assignUserRoles(user.id, [...selectedIds]);
      onSaved();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save role assignments.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] modal-clearance flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Assign Roles</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {user.firstName} {user.lastName} · {user.email}
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-96 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading roles…
            </div>
          ) : allRoles.length === 0 ? (
            <p className="text-sm text-center text-[var(--text-muted)] py-8">
              No roles available. Create roles first in the Roles &amp; Permissions page.
            </p>
          ) : (
            allRoles.map((role) => {
              const selected = selectedIds.has(role.id);
              return (
                <button key={role.id} onClick={() => toggle(role.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    selected
                      ? 'border-brand-600/40 bg-brand-600/5'
                      : 'border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]'
                  }`}>
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                    selected ? 'bg-brand-600 border-brand-600' : 'border-[var(--border)]'
                  }`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{role.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                      {role.description ? ` · ${role.description}` : ''}
                    </p>
                  </div>
                  <Shield className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
                </button>
              );
            })
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-5 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving || loading} className="btn-primary flex-1">
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
              </span>
            ) : 'Save Roles'}
          </button>
        </div>
      </div>
    </div>
  );
}
