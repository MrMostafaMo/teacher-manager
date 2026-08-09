import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Clock, DatabaseBackup, Download, HardDrive, Info, Languages, MonitorCog, Moon, RotateCcw, Settings2, Sun, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSelector, ThemeSelector } from "@/shared/AppearanceControls";
import { PageHeader } from "@/shared/PageHeader";
import { Segmented } from "@/shared/Segmented";
import { useTimeStore } from "@/lib/time-store";
import { useThemeStore } from "@/lib/theme/theme-store";
import { useWeekStore } from "@/lib/week-store";
import { APP_VERSION } from "@/app/navigation";
import {
  createBackup,
  restoreFromBackup,
  liveDbPath,
} from "@/features/settings/application/settings-cases";
import { liveDbSize } from "@/features/settings/infrastructure/backup-service";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const setHour24 = useTimeStore((s) => s.setHour24);
  const weekStartsOn = useWeekStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useWeekStore((s) => s.setWeekStartsOn);
  const theme = useThemeStore((s) => s.theme);
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : MonitorCog;
  const [dbPath, setDbPath] = useState("");
  const [dbSize, setDbSize] = useState<number | null>(null);
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void liveDbPath().then(setDbPath);
  }, []);

  useEffect(() => {
    void liveDbSize()
      .then(setDbSize)
      .catch(() => undefined);
  }, [saved]);

  async function handleBackup() {
    if (busy) return;
    setBusy("backup");
    setError("");
    setSaved("");
    try {
      const result = await createBackup();
      if (result.saved) setSaved(t("settings.backupDone"));
    } catch (e) {
      console.error("Backup failed", e);
      setError(t("settings.backupError"));
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    if (busy) return;
    setBusy("restore");
    setError("");
    setSaved("");
    try {
      const result = await restoreFromBackup(t("settings.restoreConfirm"));
      if (result.status === "done") {
        setSaved(t("settings.restoreDone"));
        window.setTimeout(() => window.location.reload(), 800);
      } else if (result.status === "error") {
        setError(t(`settings.${result.message ?? "restoreError"}`));
      }
    } catch (e) {
      console.error("Restore failed", e);
      setError(t("settings.restoreError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.settings")} description={t("settings.subtitle")} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-success">{saved}</p>}

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Info className="size-4" />
            {t("settings.about")}
          </div>
          <div className="flex items-start gap-4">
            <img
              src="/logo.png"
              alt={t("app.name")}
              className="size-16 shrink-0 rounded-xl object-contain ring-1 ring-border"
            />
            <div className="space-y-1 text-sm">
              <p className="text-lg font-semibold">{t("app.name")}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <span>{t("settings.aboutVersion")}</span>
                <span className="font-mono text-foreground" dir="ltr">
                  {APP_VERSION}
                </span>
              </p>
              <p className="pt-1 text-xs text-muted-foreground">{t("settings.aboutTagline")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <HardDrive className="size-4" />
            {t("settings.data")}
          </div>
          <dl className="mb-4 space-y-1 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt>{t("settings.dbPath")}</dt>
              <dd className="font-mono text-xs break-all text-foreground" dir="ltr">
                {dbPath || "…"}
              </dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <dt>{t("settings.dbSize")}</dt>
              <dd className="text-foreground">{dbSize === null ? "…" : formatSize(dbSize)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void handleBackup()} disabled={busy !== null}>
              <Download />
              {busy === "backup" ? t("settings.backingUp") : t("settings.backupAction")}
            </Button>
            <Button variant="outline" onClick={() => void handleRestore()} disabled={busy !== null}>
              <Upload />
              {busy === "restore" ? t("settings.restoring") : t("settings.restoreAction")}
            </Button>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <DatabaseBackup className="size-3.5" />
            {t("settings.backupHint")}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="size-3.5" />
            {t("settings.restoreHint")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
