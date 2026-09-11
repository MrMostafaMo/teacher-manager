import { isThemePreset, DEFAULT_PRESET } from "@/lib/theme/theme-presets";
import type { Theme, ThemePreset } from "@/lib/theme/theme-store";
import type { Language } from "@/lib/i18n/language-store";
import type { WeekStartsOn } from "@/lib/week-store";
import { DEFAULT_SESSIONS_PER_CYCLE, DEFAULT_WARNING_AT } from "@/lib/session-defaults";

export interface SettingsSnapshot {
  theme: Theme;
  preset: ThemePreset;
  customPrimary: string | null;
  language: Language;
  hour24: boolean;
  weekStartsOn: WeekStartsOn;
  isPinned: boolean;
  lastNonContrast: ThemePreset | null;
  billingMode: "calendar" | "sessions";
  sessionsPerCycle: number;
  warningAt: number;
  notificationsEnabled: boolean;
  osBanners: boolean;
  mutedTypes: Record<string, boolean>;
  shortcuts: Record<string, string>;
}

function read<T>(key: string): { state?: T } | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as { state?: T };
  } catch {
    return null;
  }
}

/**
 * Synchronous boot read: `tm-settings` first (validated), then the eight
 * legacy keys. Used pre-paint in main.tsx and the index.html flash guard.
 */
export function readInitialSettingsSnapshot(): SettingsSnapshot {
  try {
    const raw = localStorage.getItem("tm-settings");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: Partial<SettingsSnapshot> };
      if (parsed?.state && typeof parsed.state === "object") {
        const merged = migrateLegacySettings(parsed.state, 1);
        if (merged.theme !== "light" && merged.theme !== "dark" && merged.theme !== "system") {
          merged.theme = "system";
        }
        if (!isThemePreset(merged.preset)) merged.preset = DEFAULT_PRESET;
        if (merged.language !== "ar" && merged.language !== "en") merged.language = "ar";
        if (merged.weekStartsOn !== 0 && merged.weekStartsOn !== 6) merged.weekStartsOn = 0;
        return merged;
      }
    }
  } catch {
    /* corrupted storage — fall through to legacy import */
  }
  return migrateLegacySettings(undefined, 0);
}

/** Merge a persisted v1 snapshot over defaults + import legacy keys on v0. */
export function migrateLegacySettings(
  persisted: Partial<SettingsSnapshot> | undefined,
  version: number | undefined,
): SettingsSnapshot {
  const base: SettingsSnapshot = {
    theme: "system",
    preset: DEFAULT_PRESET,
    customPrimary: null,
    language: "ar",
    hour24: false,
    weekStartsOn: 0,
    isPinned: false,
    lastNonContrast: null,
    billingMode: "calendar",
    sessionsPerCycle: DEFAULT_SESSIONS_PER_CYCLE,
    warningAt: DEFAULT_WARNING_AT,
    notificationsEnabled: true,
    osBanners: true,
    mutedTypes: {},
    shortcuts: {},
  };
  const merged: SettingsSnapshot = { ...base, ...(persisted ?? {}) };
  if (version !== undefined && version >= 1) return merged;

  const theme = read<{ theme?: unknown; preset?: unknown; customPrimary?: unknown }>("tm-theme");
  if (theme?.state?.theme === "light" || theme?.state?.theme === "dark" || theme?.state?.theme === "system") {
    merged.theme = theme.state.theme;
  }
  if (isThemePreset(theme?.state?.preset)) merged.preset = theme.state.preset;
  if (typeof theme?.state?.customPrimary === "string" || theme?.state?.customPrimary === null) {
    merged.customPrimary = theme.state.customPrimary as string | null;
  }
  const lang = read<{ language?: unknown }>("tm-language");
  if (lang?.state?.language === "ar" || lang?.state?.language === "en") merged.language = lang.state.language;

  const time = read<{ hour24?: unknown }>("tm-time");
  if (typeof time?.state?.hour24 === "boolean") merged.hour24 = time.state.hour24;

  const week = read<{ weekStartsOn?: unknown }>("tm-week");
  if (week?.state?.weekStartsOn === 0 || week?.state?.weekStartsOn === 6) {
    merged.weekStartsOn = week.state.weekStartsOn;
  }
  const sidebar = read<{ isPinned?: unknown }>("tm-sidebar-pin");
  if (typeof sidebar?.state?.isPinned === "boolean") merged.isPinned = sidebar.state.isPinned;

  const sessions = read<{ billingMode?: unknown; sessionsPerCycle?: unknown; warningAt?: unknown }>(
    "tm-session-settings",
  );
  if (sessions?.state?.billingMode === "sessions") merged.billingMode = "sessions";
  const spc = sessions?.state?.sessionsPerCycle;
  if (typeof spc === "number" && spc >= 1 && spc <= 30) merged.sessionsPerCycle = spc;
  const wa = sessions?.state?.warningAt;
  if (typeof wa === "number" && wa >= 1 && wa < merged.sessionsPerCycle) merged.warningAt = wa;

  const notif = read<{ enabled?: unknown; osBanners?: unknown; mutedTypes?: unknown }>(
    "tm-notification-settings",
  );
  if (typeof notif?.state?.enabled === "boolean") merged.notificationsEnabled = notif.state.enabled;
  if (typeof notif?.state?.osBanners === "boolean") merged.osBanners = notif.state.osBanners;
  if (typeof notif?.state?.mutedTypes === "object" && notif?.state?.mutedTypes !== null) {
    merged.mutedTypes = notif.state.mutedTypes as Record<string, boolean>;
  }
  const shortcuts = read<{ shortcuts?: unknown }>("tm-shortcuts");
  if (typeof shortcuts?.state?.shortcuts === "object" && shortcuts?.state?.shortcuts !== null) {
    const rows = shortcuts.state.shortcuts as Record<string, unknown>;
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(rows)) if (typeof v === "string") clean[k] = v;
    merged.shortcuts = { ...merged.shortcuts, ...clean };
  }
  return merged;
}
