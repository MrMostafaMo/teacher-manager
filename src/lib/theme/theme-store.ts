import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyCustomPrimary } from "./theme-custom";

export type Theme = "light" | "dark" | "system";

/** Visual identity palette, orthogonal to the light/dark mode. */
export type ThemePreset =
  | "nile"
  | "warm"
  | "midnight"
  | "academy"
  | "forest"
  | "ocean"
  | "rose"
  | "slate"
  | "contrast";

export const STORAGE_KEY = "tm-theme";
export const DEFAULT_PRESET: ThemePreset = "nile";

const PRESETS: readonly ThemePreset[] = [
  "nile",
  "warm",
  "midnight",
  "academy",
  "forest",
  "ocean",
  "rose",
  "slate",
  "contrast",
];

interface ThemeState {
  theme: Theme;
  preset: ThemePreset;
  customPrimary: string | null;
  setTheme: (theme: Theme) => void;
  setPreset: (preset: ThemePreset) => void;
  setCustomPrimary: (color: string | null) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      preset: DEFAULT_PRESET,
      customPrimary: null,
      setTheme: (theme) => set({ theme }),
      setPreset: (preset) => set({ preset }),
      setCustomPrimary: (color) => set({ customPrimary: color }),
    }),
    { name: STORAGE_KEY },
  ),
);

/** Type guard for values read back from localStorage. */
export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === "string" && (PRESETS as readonly string[]).includes(value);
}

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


