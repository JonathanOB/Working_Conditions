import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CoefficientEntry {
  id: string;
  date: string;       // ISO date string
  destination: string;
  iata: string;
  coefficient: number;
  daysOffRostered: number;
  notes?: string;
}

interface CoefficientStore {
  entries: CoefficientEntry[];
  addEntry: (e: Omit<CoefficientEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
  reset: () => void;
}

export const useCoefficientStore = create<CoefficientStore>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (e) =>
        set((s) => ({
          entries: [...s.entries, { ...e, id: Date.now().toString() }],
        })),
      removeEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((x) => x.id !== id) })),
      reset: () => set({ entries: [] }),
    }),
    {
      name: 'wb-coefficient-log',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Computed: running balance
// Each duty generates a coefficient value. Running balance = sum of coefficients - sum of days rostered off
export function useCoeffBalance(): number {
  const entries = useCoefficientStore((s) => s.entries);
  return entries.reduce((sum, e) => sum + e.coefficient - e.daysOffRostered, 0);
}
