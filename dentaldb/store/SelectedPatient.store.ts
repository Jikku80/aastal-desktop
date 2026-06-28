import { create } from 'zustand';
import type { Patient } from '@/types';

interface SelectedPatientState {
  patient: Patient | null;
  setPatient: (patient: Patient | null) => void;
  clearPatient: () => void;
}

export const useSelectedPatientStore = create<SelectedPatientState>((set) => ({
  patient: null,
  setPatient: (patient) => set({ patient }),
  clearPatient: () => set({ patient: null }),
}));