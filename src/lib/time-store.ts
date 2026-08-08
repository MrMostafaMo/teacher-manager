import { create } from "zustand";
import { persist } from "zustand/middleware";

export const STORAGE_KEY = "tm-time";

interface TimeState {
  hour24: boolean;
  setHour24: (hour24: boolean) => void;
}

export const useTimeStore = create<TimeState>()(
  persist(
    (set) => ({
      hour24: false,
      setHour24: (hour24) => set({ hour24 }),
    }),
    { name: STORAGE_KEY },
  ),
);
