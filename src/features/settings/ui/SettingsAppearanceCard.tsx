import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Clock,
  Languages,
  MonitorCog,
  Moon,
  Palette,
  Settings2,
  Sun,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSelector, ThemeSelector } from "@/shared/AppearanceControls";
import { PresetPicker } from "@/shared/preset-picker";
import { Segmented } from "@/shared/Segmented";
import { useTimeStore } from "@/lib/time-store";
import { useThemeStore } from "@/lib/theme/theme-store";
import { useWeekStore } from "@/lib/week-store";

export function SettingsAppearanceCard() {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const setHour24 = useTimeStore((s) => s.setHour24);
  const weekStartsOn = useWeekStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useWeekStore((s) => s.setWeekStartsOn);
  const theme = useThemeStore((s) => s.theme);
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : MonitorCog;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Settings2 className="size-4" />
          {t("settings.appearance")}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Languages className="size-4 text-muted-foreground" />
              {t("common.language")}
            </div>
            <LanguageSelector />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <ThemeIcon className="size-4 text-muted-foreground" />
              {t("common.theme")}
            </div>
            <ThemeSelector />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Palette className="size-4 text-muted-foreground" />
              {t("settings.preset")}
            </div>
            <PresetPicker />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              {t("settings.timeFormat")}
            </div>
            <Segmented
              value={hour24 ? "24" : "12"}
              onChange={(v) => setHour24(v === "24")}
              options={[
                { value: "12", label: t("settings.clock12") },
                { value: "24", label: t("settings.clock24") },
              ]}
              ariaLabel={t("settings.timeFormat")}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="size-4 text-muted-foreground" />
              {t("settings.weekStartsOn")}
            </div>
            <Segmented
              value={String(weekStartsOn)}
              onChange={(v) => setWeekStartsOn(v === "6" ? 6 : 0)}
              options={[
                { value: "0", label: t("settings.weekSunday") },
                { value: "6", label: t("settings.weekSaturday") },
              ]}
              ariaLabel={t("settings.weekStartsOn")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
