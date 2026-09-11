import { shimStore } from "@/lib/settings/settings-store";

export const STORAGE_KEY = "tm-session-settings";

export { DEFAULT_SESSIONS_PER_CYCLE, DEFAULT_WARNING_AT } from "@/lib/session-defaults";

export interface SessionSettingsState {
  billingMode: "calendar" | "sessions";
  sessionsPerCycle: number;
  warningAt: number;
  setBillingMode: (m: "calendar" | "sessions") => void;
  setSessionsPerCycle: (n: number) => void;
  setWarningAt: (n: number) => void;
}

/** Compatibility shim over the unified settings store (one release). */
export const useSessionSettings = shimStore<SessionSettingsState>((s) => ({
  billingMode: s.billingMode,
  sessionsPerCycle: s.sessionsPerCycle,
  warningAt: s.warningAt,
  setBillingMode: s.setBillingMode,
  setSessionsPerCycle: s.setSessionsPerCycle,
  setWarningAt: s.setWarningAt,
}));
