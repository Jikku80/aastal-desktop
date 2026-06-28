import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Clinic, Branch } from '@/types';

interface AuthState {
  user:            User   | null;
  clinic:          Clinic | null;
  activeBranch:    Branch | null;
  branches:        Branch[];
  isAuthenticated: boolean;
  isHydrated:      boolean;

  setAuth:         (user: User, clinic: Clinic | null) => void;
  setClinic:       (clinic: Clinic) => void;
  setBranches:     (branches: Branch[]) => void;
  /**
   * setActiveBranch rules:
   * 1. Single-branch non-owner: cannot switch away from their only branch.
   * 2. Locked branches (isLocked=true) cannot be set as active context.
   * 3. Inactive branches (isActive=false) cannot be set as active context.
   *    (Switching is handled via BranchSwitcher which shows toasts for these cases.)
   */
  setActiveBranch: (branch: Branch | null) => void;
  updateUser:      (data: Partial<User>) => void;
  logout:          () => void;
  setHydrated:     () => void;
}

const OWNER_ROLES = new Set(['super_admin', 'owner']);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      clinic:          null,
      activeBranch:    null,
      branches:        [],
      isAuthenticated: false,
      isHydrated:      false,

      setAuth: (user, clinic) => set({ user, clinic, isAuthenticated: true }),

      setClinic: (clinic) => set({ clinic }),

      setBranches: (branches) =>
        set((s) => {
          const isOwner = OWNER_ROLES.has(s.user?.role ?? '');

          // Single-branch non-owner: always lock to that branch
          if (!isOwner && branches.length === 1) {
            return { branches, activeBranch: branches[0] };
          }

          // Multi-branch or owner: keep persisted activeBranch if it is
          // still present, active, and not locked. Otherwise fall back to
          // the first active branch.
          const currentId = s.activeBranch?.id;
          const stillValid = currentId
            ? branches.some(b => b.id === currentId && b.isActive && !b.isLocked)
            : false;

          const firstActive = branches.find(b => b.isActive && !b.isLocked) ?? null;

          return {
            branches,
            activeBranch: stillValid
              ? branches.find(b => b.id === currentId) ?? firstActive
              : firstActive,
          };
        }),

      setActiveBranch: (branch) =>
        set((s) => {
          const isOwner        = OWNER_ROLES.has(s.user?.role ?? '');
          const isSingleLocked = !isOwner && s.branches.length === 1;

          // Prevent non-admin single-branch users from switching
          if (isSingleLocked) return s;

          // Don't allow setting locked/inactive branches as active context
          if (branch && (branch.isLocked || !branch.isActive)) return s;

          return { activeBranch: branch };
        }),

      updateUser: (data) =>
        set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),

      logout: () =>
        set({
          user:            null,
          clinic:          null,
          activeBranch:    null,
          branches:        [],
          isAuthenticated: false,
        }),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'dentalos-auth',
      version: 2,
      migrate: (persistedState: any, version: number) => {
        // Safely handle corrupted or outdated persisted state from previous
        // deployments — prevents the "client-side exception" crash on login.
        if (!persistedState || typeof persistedState !== 'object') {
          return { user: null, clinic: null, activeBranch: null, branches: [], isAuthenticated: false };
        }
        // Ensure arrays are actually arrays (schema mismatch guard)
        if (!Array.isArray(persistedState.branches)) {
          persistedState.branches = [];
        }
        return persistedState;
      },
      partialize: (s) => ({
        user:            s.user,
        clinic:          s.clinic,
        activeBranch:    s.activeBranch,
        branches:        s.branches,
        isAuthenticated: s.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
