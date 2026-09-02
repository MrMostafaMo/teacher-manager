import { useTranslation } from "react-i18next";
import { CalendarDays, Clock, Eye, Languages, MonitorCog, Moon, Palette, Sun } from "lucide-react";
import { LanguageSelector, ThemeSelector } from "@/shared/AppearanceControls";
import { CustomColorPicker } from "@/shared/custom-color-picker";
import { PresetPicker } from "@/shared/preset-picker";
import { Segmented } from "@/shared/Segmented";
import { SettingsCardShell } from "@/shared/SettingsCardShell";
import { ThemePreview } from "@/shared/theme-preview";
import { useTimeStore } from "@/lib/time-store";
import { useThemeStore } from "@/lib/theme/theme-store";
import { useWeekStore } from "@/lib/week-store";

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Languages;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </div>
      {children}
    </div>
  );
}

export function SettingsAppearanceCard() {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const setHour24 = useTimeStore((s) => s.setHour24);
  const weekStartsOn = useWeekStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useWeekStore((s) => s.setWeekStartsOn);
  const theme = useThemeStore((s) => s.theme);
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : MonitorCog;
  return (
    <SettingsCardShell icon={Palette} title={t("settings.appearance")}>
      <div className="divide-y divide-border/60">
        <Row icon={Languages} label={t("common.language")}>
          <LanguageSelector />
        </Row>
        <Row icon={ThemeIcon} label={t("common.theme")}>
          <ThemeSelector />
        </Row>
        <Row icon={Palette} label={t("settings.preset")}>
          <PresetPicker />
        </Row>
        <div className="py-3">
          <div className="mb-2 flex items-center gap-2 text-sm">
            <Eye className="size-4 text-muted-foreground" />
            {t("settings.appearance")}
          </div>
          <ThemePreview />
        </div>
        <Row icon={Palette} label={t("settings.customColor")}>
          <CustomColorPicker />
        </Row>
        <Row icon={Clock} label={t("settings.timeFormat")}>
          <Segmented
            value={hour24 ? "24" : "12"}
            onChange={(v) => setHour24(v === "24")}
            options={[
              { value: "12", label: t("settings.clock12") },
              { value: "24", label: t("settings.clock24") },
            ]}
            ariaLabel={t("settings.timeFormat")}
          />
        </Row>
        <Row icon={CalendarDays} label={t("settings.weekStartsOn")}>
          <Segmented
            value={String(weekStartsOn)}
            onChange={(v) => setWeekStartsOn(v === "6" ? 6 : 0)}
            options={[
              { value: "0", label: t("settings.weekSunday") },
              { value: "6", label: t("settings.weekSaturday") },
            ]}
            ariaLabel={t("settings.weekStartsOn")}
          />
        </Row>
      </div>
    </SettingsCardShell>
  );
}
