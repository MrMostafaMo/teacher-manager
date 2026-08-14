import { useEffect, type ReactNode } from "react";
import { applyTheme, useThemeStore } from "@/lib/theme/theme-store";

/**
 * Keeps the document theme (mode + palette preset) in sync with the persisted
 * store and reacts to OS-level scheme changes while the mode is "system".
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const preset = useThemeStore((s) => s.preset);

  useEffect(() => {
    applyTheme(theme, preset);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme, preset);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme, preset]);

  return <>{children}</>;
}
