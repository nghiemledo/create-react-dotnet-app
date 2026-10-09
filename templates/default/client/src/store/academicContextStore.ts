import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AcademicContextState {
  campusId: number | null;
  academicYearId: number | null;
  semesterId: number | null;
  setCampusId: (campusId: number | null) => void;
  setAcademicYearId: (academicYearId: number | null) => void;
  setSemesterId: (semesterId: number | null) => void;
  resetAcademicContext: () => void;
}

export const useAcademicContextStore = create<AcademicContextState>()(
  persist(
    (set) => ({
      campusId: null,
      academicYearId: null,
      semesterId: null,
      setCampusId: (campusId) => set({ campusId }),
      setAcademicYearId: (academicYearId) => set({ academicYearId }),
      setSemesterId: (semesterId) => set({ semesterId }),
      resetAcademicContext: () =>
        set({ campusId: null, academicYearId: null, semesterId: null }),
    }),
    { name: 'training-academic-context' },
  ),
);
