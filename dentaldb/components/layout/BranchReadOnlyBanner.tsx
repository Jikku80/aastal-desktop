'use client';
import { Lock, AlertTriangle } from 'lucide-react';
import { useBranchReadOnly } from '@/hooks/useBranchReadOnly';
import { useAuthStore } from '@/store/auth.store';

/**
 * Drop this banner at the top of any page to show read-only warnings.
 *
 * Shows one of two states:
 *  - quota_exceeded  → branch locked because plan branch quota was reduced
 *  - inactive        → branch deactivated because active-branch quota was reached
 *
 * Both states block all mutations on the branch (enforced by BranchLockGuard on backend).
 */
export function BranchReadOnlyBanner() {
  const { isReadOnly, reason } = useBranchReadOnly();
  const { activeBranch } = useAuthStore();

  if (!activeBranch || !isReadOnly) return null;

  const isQuotaLock = reason === 'quota_exceeded';

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4"
      style={{
        background: isQuotaLock ? 'rgba(239,68,68,0.06)' : 'rgba(107,114,128,0.08)',
        border: `1px solid ${isQuotaLock ? 'rgba(239,68,68,0.2)' : 'rgba(107,114,128,0.2)'}`,
      }}
    >
      {isQuotaLock ? (
        <AlertTriangle size={14} className="text-red-400 shrink-0" />
      ) : (
        <Lock size={14} className="text-gray-400 shrink-0" />
      )}
      <p
        className="text-xs font-medium"
        style={{ color: isQuotaLock ? 'rgb(248,113,113)' : 'rgb(156,163,175)' }}
      >
        {isQuotaLock
          ? `"${activeBranch.name}" is locked — branch quota exceeded. Upgrade your plan to unlock.`
          : `"${activeBranch.name}" is inactive. Activate it from the Branches page to resume operations.`}
      </p>
    </div>
  );
}

export { useBranchReadOnly };
