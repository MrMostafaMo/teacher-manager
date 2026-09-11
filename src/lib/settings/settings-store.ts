import { create, type StoreApi } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import type { Theme, ThemePreset } from "@/lib/theme/theme-store";
import type { Language } from "@/lib/i18n/language-store";
import type { WeekStartsOn } from "@/lib/week-store";
import { isThemePreset, DEFAULT_PRESET } from "@/lib/theme/theme-presets";
import { DEFAULT_SESSIONS_PER_CYCLE, DEFAULT_WARNING_AT } from "@/lib/session-defaults";
import { migrateLegacySettings, type SettingsSnapshot } from "./settings-migrate";
import {
  findDuplicateShortcut,
  getDefaultShortcut,
  mergeShortcuts,
  shortcutDefaults,
} from "./settings-shortcuts";
import type { ShortcutActionId } from "@/lib/shortcuts/types";

export { findDuplicateShortcut, getDefaultShortcut, mergeShortcuts, shortcutDefaults };

export const SETTINGS_KEY = "tm-settings";
export const SETTINGS_VERSION = 1;

export interface SettingsState extends SettingsSnapshot {
  setTheme: (theme: Theme) => void;
  setPreset: (preset: ThemePreset) => void;
  setCustomPrimary: (color: string | null) => void;
  setLanguage: (language: Language) => void;
  setHour24: (hour24: boolean) => void;
  setWeekStartsOn: (weekStartsOn: WeekStartsOn) => void;
  setPinned: (isPinned: boolean) => void;
  togglePinned: () => void;
  /** Last non-contrast preset (restored when high-contrast turns off). */
  lastNonContrast: ThemePreset | null;
  setContrastEnabled: (on: boolean) => void;
  setBillingMode: (mode: "calendar" | "sessions") => void;
  setSessionsPerCycle: (n: number) => void;
  setWarningAt: (n: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  /** Legacy alias for setNotificationsEnabled (shim period). */
  setEnabled: (enabled: boolean) => void;
  setOsBanners: (osBanners: boolean) => void;
  toggleMutedType: (type: string) => void;
  /** Legacy alias for toggleMutedType (shim period). */
  toggleType: (type: string) => void;
  setShortcut: (id: ShortcutActionId, combo: string) => void;
  resetShortcut: (id: ShortcutActionId) => void;
  resetShortcuts: () => void;
  getDefault: (id: ShortcutActionId) => string | undefined;
  findDuplicate: (selfId: ShortcutActionId, combo: string) => ShortcutActionId | undefined;
}

export const defaultSettings: SettingsSnapshot = {
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

/**
 * Versioned unified settings (additive — legacy per-slice stores stay until
 * the one-release shim cutover). v1 migrates the eight `tm-*` keys once.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      setTheme: (theme) => set({ theme }),
      setPreset: (preset) => set({ preset }),
      setCustomPrimary: (customPrimary) => set({ customPrimary }),
      setLanguage: (language) => set({ language }),
      setHour24: (hour24) => set({ hour24 }),
      setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
      setPinned: (isPinned) => set({ isPinned }),
      togglePinned: () => set((s) => ({ isPinned: !s.isPinned })),
      setContrastEnabled: (on) =>
        set((s) => {
          if (on) {
            if (s.preset === "contrast") return {};
            return { lastNonContrast: s.preset, preset: "contrast" as const };
          }
          return { preset: s.lastNonContrast ?? DEFAULT_PRESET };
        }),
      setBillingMode: (billingMode) => set({ billingMode }),
      setSessionsPerCycle: (sessionsPerCycle) => set({ sessionsPerCycle }),
      setWarningAt: (warningAt) => set({ warningAt }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setOsBanners: (osBanners) => set({ osBanners }),
      toggleMutedType: (type) =>
        set((s) => ({ mutedTypes: { ...s.mutedTypes, [type]: !s.mutedTypes[type] } })),
      toggleType: (type) =>
        set((s) => ({ mutedTypes: { ...s.mutedTypes, [type]: !s.mutedTypes[type] } })),
      setShortcut: (id, combo) =>
        set((s) => ({ shortcuts: { ...s.shortcuts, [id]: combo } })),
      resetShortcut: (id) =>
        set((s) => ({ shortcuts: { ...s.shortcuts, [id]: getDefaultShortcut(id) ?? "" } })),
      resetShortcuts: () => set({ shortcuts: shortcutDefaults() }),
      getDefault: (id) => getDefaultShortcut(id),
      findDuplicate: (selfId, combo) => findDuplicateShortcut(get().shortcuts, selfId, combo),
    }),
    {
      name: SETTINGS_KEY,
      version: SETTINGS_VERSION,
      migrate: (persisted, version) =>
        migrateLegacySettings(persisted as Partial<SettingsSnapshot> | undefined, version),
      merge: (persisted, current) => {
        const saved = persisted as Partial<SettingsSnapshot> | null;
        return { ...current, ...saved, shortcuts: mergeShortcuts(saved?.shortcuts) };
      },
      partialize: (s) => ({
        theme: s.theme,
        preset: s.preset,
        customPrimary: s.customPrimary,
        language: s.language,
        hour24: s.hour24,
        weekStartsOn: s.weekStartsOn,
        isPinned: s.isPinned,
        lastNonContrast: s.lastNonContrast,
        billingMode: s.billingMode,
        sessionsPerCycle: s.sessionsPerCycle,
        warningAt: s.warningAt,
        notificationsEnabled: s.notificationsEnabled,
        osBanners: s.osBanners,
        mutedTypes: s.mutedTypes,
        shortcuts: s.shortcuts,
      }),
    },
  ),
);

export { isThemePreset };

export interface ShimStore<T> {
  (): T;
  <S>(selector: (s: T) => S): S;
  getState: () => T;
  setState: StoreApi<SettingsState>["setState"];
  subscribe: StoreApi<SettingsState>["subscribe"];
}

/**
 * One-release compatibility shim factory: exposes a legacy slice API over
 * the unified store. No dual writes — persistence lives under `tm-settings`
 * only. Lazy accessors avoid breaking the slice ⇄ settings import cycle.
 */
export function shimStore<T>(select: (s: SettingsState) => T): ShimStore<T> {
  function useShimStore(): T;
  function useShimStore<S>(selector: (s: T) => S): S;
  function useShimStore<S>(selector?: (s: T) => S): S | T {
    // Unconditional shallow-selected subscription: fresh slice identities
    // never loop renders, and scalar selections stay referentially stable.
    const fn = (selector ?? ((s: T) => s)) as (s: T) => S;
    return useSettingsStore(useShallow((s) => fn(select(s))));
  }
  const store = Object.assign(useShimStore, {
    getState: (): T => select(useSettingsStore.getState()),
  });
  Object.defineProperties(store, {
    setState: { get: () => useSettingsStore.setState },
    subscribe: { get: () => useSettingsStore.subscribe },
  });
  return store as ShimStore<T>;
}
