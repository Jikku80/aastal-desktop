import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { hasPermission, hasAnyPermission, Permission } from '@/lib/permissions';

interface PermissionsState {
  permissions: string[];
  isLoaded:    boolean;

  setPermissions:   (permissions: string[]) => void;
  clearPermissions: () => void;
  setLoaded:        (v: boolean) => void;

  can:    (permission: Permission | null) => boolean;
  canAny: (permissions: Permission[]) => boolean;
}

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set, get) => ({
      permissions: [],
      isLoaded:    false,

      setPermissions:   (permissions) => set({ permissions, isLoaded: true }),
      clearPermissions: ()            => set({ permissions: [], isLoaded: false }),
      setLoaded:        (v)           => set({ isLoaded: v }),

      can:    (permission) => hasPermission(get().permissions, permission),
      canAny: (perms)      => hasAnyPermission(get().permissions, perms),
    }),
    {
      name: 'dentalos-permissions',
      partialize: (s) => ({ permissions: s.permissions }),
      onRehydrateStorage: () => (state) => {
        state?.setLoaded(true);
      },
    },
  ),
);

export function usePermissions() {
  return usePermissionsStore((s) => ({
    permissions: s.permissions,
    isLoaded:    s.isLoaded,
    can:         s.can,
    canAny:      s.canAny,
  }));
}
