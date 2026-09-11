import { shimStore } from "@/lib/settings/settings-store";
import { DEFAULT_PRESET, isThemePreset } from "./theme-presets";
import type { ThemePreset } from "./theme-presets";
import { applyCustomPrimary } from "./theme-custom";

export type { ThemePreset } from "./theme-presets";
export { DEFAULT_PRESET, isThemePreset };

export type Theme = "light" | "dark" | "system";

export const STORAGE_KEY = "tm-theme";

export interface ThemeState {
  theme: Theme;
  preset: ThemePreset;
  customPrimary: string | null;
  setTheme: (theme: Theme) => void;
  setPreset: (preset: ThemePreset) => void;
  setCustomPrimary: (color: string | null) => void;
}

/** Compatibility shim over the unified settings store (one release). */
export const useThemeStore = shimStore<ThemeState>((s) => ({
  theme: s.theme,
  preset: s.preset,
  customPrimary: s.customPrimary,
  setTheme: s.setTheme,
  setPreset: s.setPreset,
  setCustomPrimary: s.setCustomPrimary,
}));

// Re-export custom-primary helpers (keeps this file <150, ponytail split).
export { applyCustomPrimary, isValidHex, readInitialCustomPrimary } from "./theme-custom";

/**
 * Resolves the effective theme and applies it to the document root: the mode
 * class ("dark") plus the preset palette via the `data-theme` attribute.
 * Optionally applies a custom primary override on top of the preset.
 */
export function applyTheme(
  theme: Theme,
  preset: ThemePreset = DEFAULT_PRESET,
  customPrimary: string | null = null,
): "light" | "dark" {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
  document.documentElement.dataset.theme = preset;
  applyCustomPrimary(customPrimary);
  return resolved;
}

/** Synchronous read of the persisted theme (defaults to "system"). */
export function readInitialTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { theme?: unknown } };
      const theme = parsed?.state?.theme;
      if (theme === "light" || theme === "dark" || theme === "system") return theme;
    }
  } catch {
    /* corrupted storage — fall through to default */
  }
  return "system";
}

/** Synchronous read of the persisted preset (defaults to "nile"). */
export function readInitialPreset(): ThemePreset {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { preset?: unknown } };
      const preset = parsed?.state?.preset;
      if (isThemePreset(preset)) return preset;
    }
  } catch {
    /* corrupted storage — fall through to default */
  }
  return DEFAULT_PRESET;
}


