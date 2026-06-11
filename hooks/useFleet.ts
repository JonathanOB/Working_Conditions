import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Fleet } from '../lib/fleet';

interface FleetStore {
  fleet: Fleet;
  setFleet: (f: Fleet) => void;
}

export const useFleetStore = create<FleetStore>()(
  persist(
    (set) => ({
      fleet: 'wb' as Fleet,
      setFleet: (fleet) => set({ fleet }),
    }),
    {
      name: 'pilot-fleet',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const useFleet = () => useFleetStore((s) => s.fleet);
export const useSetFleet = () => useFleetStore((s) => s.setFleet);
