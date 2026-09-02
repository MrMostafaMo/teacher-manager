import { useEffect, type ReactNode } from "react";
import { applyTheme, useThemeStore } from "@/lib/theme/theme-store";

/**
 * Keeps the document theme (mode + palette preset) in sync with the persisted
 * store and reacts to OS-level scheme changes while the mode is "system".
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const preset = useThemeStore((s) => s.preset);
  const customPrimary = useThemeStore((s) => s.customPrimary);

  useEffect(() => {
    applyTheme(theme, preset, customPrimary);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme, preset, customPrimary);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, preset, customPrimary]);

  return <>{children}</>;
}
