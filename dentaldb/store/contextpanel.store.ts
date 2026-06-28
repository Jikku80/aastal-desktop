import { create } from 'zustand';
import type { Patient, User } from '@/types';

/**
 * Tracks the "currently focused" patient or staff member so the right-hand
 * ContextSidebar (profile / appointments / vitals-or-commissions) can react
 * to selections made on the Patients and Staff pages without prop-drilling.
 */
interface ContextPanelState {
  selectedPatient: Patient | null;
  selectedStaff:   User    | null;
  setSelectedPatient: (p: Patient | null) => void;
  setSelectedStaff:   (u: User    | null) => void;
  clear: () => void;
}

export const useContextPanelStore = create<ContextPanelState>((set) => ({
  selectedPatient: null,
  selectedStaff:   null,
  setSelectedPatient: (p) => set({ selectedPatient: p, selectedStaff: null }),
  setSelectedStaff:   (u) => set({ selectedStaff: u, selectedPatient: null }),
  clear: () => set({ selectedPatient: null, selectedStaff: null }),
}));