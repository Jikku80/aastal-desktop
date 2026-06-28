'use client';
import { useAuthStore } from '@/store/auth.store';

/**
 * Returns whether the currently active branch is in read-only mode.
 * A branch is read-only when:
 *  - branch.isLocked === true  → quota hard-lock (branch count exceeds plan total)
 *  - branch.isActive === false → deactivated (over active quota, user chose others)
 *
 * This hook trusts the backend-driven isLocked / isActive flags directly.
 * No frontend position-sort guessing needed.
 */
export function useBranchReadOnly(): {
  isReadOnly: boolean;
  reason: 'inactive' | 'quota_exceeded' | null;
} {
  const { activeBranch } = useAuthStore();

  if (!activeBranch) return { isReadOnly: false, reason: null };

  // Hard lock: branch count exceeds plan total quota
  if (activeBranch.isLocked) {
    return { isReadOnly: true, reason: 'quota_exceeded' };
  }

  // Soft lock: branch deactivated (active count exceeds allowed active quota)
  if (activeBranch.isActive === false) {
    return { isReadOnly: true, reason: 'inactive' };
  }

  return { isReadOnly: false, reason: null };
}
