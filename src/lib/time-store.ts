import { shimStore } from "@/lib/settings/settings-store";

export const STORAGE_KEY = "tm-time";

export interface TimeState {
  hour24: boolean;
  setHour24: (hour24: boolean) => void;
}

/** Compatibility shim over the unified settings store (one release). */
export const useTimeStore = shimStore<TimeState>((s) => ({
  hour24: s.hour24,
  setHour24: s.setHour24,
}));
