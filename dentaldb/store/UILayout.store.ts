import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UILayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  contextSidebarCollapsed: boolean;
  toggleContextSidebar: () => void;
  setContextSidebarCollapsed: (v: boolean) => void;

  contextSidebarClosed: boolean;
  setContextSidebarClosed: (v: boolean) => void;

  navHidden: boolean;
  setNavHidden: (v: boolean) => void;
}

export const useUILayoutStore = create<UILayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      contextSidebarCollapsed: false,
      toggleContextSidebar: () => set(s => ({ contextSidebarCollapsed: !s.contextSidebarCollapsed })),
      setContextSidebarCollapsed: (v) => set({ contextSidebarCollapsed: v }),

      contextSidebarClosed: false,
      setContextSidebarClosed: (v) => set({ contextSidebarClosed: v }),

      navHidden: false,
      setNavHidden: (v) => set({ navHidden: v }),
    }),
    { name: 'dentalos-ui-layout' },
  ),
);