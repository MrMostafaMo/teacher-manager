import { create } from "zustand";
import { persist } from "zustand/middleware";

export const STORAGE_KEY = "tm-session-settings";

export const DEFAULT_SESSIONS_PER_CYCLE = 8;
export const DEFAULT_WARNING_AT = 6;

interface SessionSettingsState {
  sessionsPerCycle: number;
  warningAt: number;
  setSessionsPerCycle: (n: number) => void;
  setWarningAt: (n: number) => void;
}

export const useSessionSettings = create<SessionSettingsState>()(
  persist(
    (set) => ({
      sessionsPerCycle: DEFAULT_SESSIONS_PER_CYCLE,
      warningAt: DEFAULT_WARNING_AT,
      setSessionsPerCycle: (sessionsPerCycle) => set({ sessionsPerCycle }),
      setWarningAt: (warningAt) => set({ warningAt }),
    }),
    { name: STORAGE_KEY },
  ),
);

export function readInitialSessionSettings(): {
  sessionsPerCycle: number;
  warningAt: number;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        state?: { sessionsPerCycle?: unknown; warningAt?: unknown };
      };
      const s = parsed?.state?.sessionsPerCycle;
      const w = parsed?.state?.warningAt;
      const sessionsPerCycle =
        typeof s === "number" && s >= 1 && s <= 30 ? s : DEFAULT_SESSIONS_PER_CYCLE;
      const warningAt =
        typeof w === "number" && w >= 1 && w < sessionsPerCycle ? w : DEFAULT_WARNING_AT;
      return { sessionsPerCycle, warningAt };
    }
  } catch {
    /* corrupted */
  }
  return { sessionsPerCycle: DEFAULT_SESSIONS_PER_CYCLE, warningAt: DEFAULT_WARNING_AT };
}
