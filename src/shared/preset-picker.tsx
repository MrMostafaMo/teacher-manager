import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useThemeStore, type ThemePreset } from "@/lib/theme/theme-store";

export interface ThemePresetOption {
  value: ThemePreset;
  labelKey: string;
  /** Tailwind bg class for the swatch dot (light-mode brand color). */
  swatch: string;
}

export const THEME_PRESETS: readonly ThemePresetOption[] = [
  { value: "nile", labelKey: "settings.presets.nile", swatch: "bg-[oklch(0.5_0.17_262)]" },
  { value: "warm", labelKey: "settings.presets.warm", swatch: "bg-[oklch(0.62_0.14_50)]" },
  { value: "midnight", labelKey: "settings.presets.midnight", swatch: "bg-[oklch(0.5_0.13_255)]" },
  { value: "academy", labelKey: "settings.presets.academy", swatch: "bg-[oklch(0.56_0.21_300)]" },
];

/** Radio-style palette picker bound to the persisted theme store. */
export function PresetPicker() {
  const { t } = useTranslation();
  const current = useThemeStore((s) => s.preset);
  const setPreset = useThemeStore((s) => s.setPreset);

  return (
    <div role="radiogroup" aria-label={t("settings.preset")} className="flex flex-wrap gap-1.5">
      {THEME_PRESETS.map((option) => {
        const active = option.value === current;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreset(option.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-ring bg-accent text-accent-foreground"
                : "border-border hover:bg-muted",
            )}
          >
            <span
              aria-hidden
              className={cn("size-3.5 rounded-full ring-1 ring-black/10", option.swatch)}
            />
            {t(option.labelKey)}
            {active && <Check className="size-3" />}
          </button>
        );
      })}
    </div>
  );
}
