import { shimStore } from "@/lib/settings/settings-store";

/** First day of the week, using JS `Date#getDay()` numbering (0 = Sunday). */
export type WeekStartsOn = 0 | 6;

export const STORAGE_KEY = "tm-week";

export interface WeekState {
  weekStartsOn: WeekStartsOn;
  setWeekStartsOn: (weekStartsOn: WeekStartsOn) => void;
}

/** Compatibility shim over the unified settings store (one release). */
export const useWeekStore = shimStore<WeekState>((s) => ({
  weekStartsOn: s.weekStartsOn,
  setWeekStartsOn: s.setWeekStartsOn,
}));

/** Rotated day indices (0=Sunday…6=Saturday) so the list starts on the chosen day. */
export function orderedDayIndices(weekStartsOn: WeekStartsOn): number[] {
  return Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7);
}
