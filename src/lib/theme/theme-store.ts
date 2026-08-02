import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

export const STORAGE_KEY = "tm-theme";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    { name: STORAGE_KEY },
  ),
);

/** Resolves the effective theme and applies it to the document root. */
export function applyTheme(theme: Theme): "light" | "dark" {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
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
