import { create } from "zustand";
import { persist } from "zustand/middleware";

/** First day of the week, using JS `Date#getDay()` numbering (0 = Sunday). */
export type WeekStartsOn = 0 | 6;

export const STORAGE_KEY = "tm-week";

interface WeekState {
  weekStartsOn: WeekStartsOn;
  setWeekStartsOn: (weekStartsOn: WeekStartsOn) => void;
}

export const useWeekStore = create<WeekState>()(
  persist(
    (set) => ({
      weekStartsOn: 0,
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
    }),
    { name: STORAGE_KEY },
  ),
);

/** Rotated day indices (0=Sunday…6=Saturday) so the list starts on the chosen day. */
export function orderedDayIndices(weekStartsOn: WeekStartsOn): number[] {
  return Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
}
