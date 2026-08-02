import { useEffect, type ReactNode } from "react";
import { applyTheme, useThemeStore } from "@/lib/theme/theme-store";

/**
 * Keeps the document theme in sync with the persisted theme store and reacts
 * to OS-level scheme changes while the theme is set to "system".
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  return <>{children}</>;
}
