import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DatabaseBackup, Download, HardDrive, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/shared/PageHeader";
import {
  createBackup,
  restoreFromBackup,
  liveDbPath,
} from "@/features/settings/application/settings-cases";
import { liveDbSize } from "@/features/settings/infrastructure/backup-service";
import { SettingsAboutCard } from "./SettingsAboutCard";
import { SettingsAppearanceCard } from "./SettingsAppearanceCard";
import { SettingsShortcutsCard } from "./SettingsShortcutsCard";
import { SettingsWhatsAppCard } from "@/features/whatsapp/ui/SettingsWhatsAppCard";
import { SyncSettingsCard } from "@/features/sync/ui/SyncSettingsCard";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function SettingsPage() {
  const { t } = useTranslation();
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

      <SettingsAboutCard />
      <SettingsAppearanceCard />
      <SettingsShortcutsCard />
      <SettingsWhatsAppCard />
      <SyncSettingsCard />

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
