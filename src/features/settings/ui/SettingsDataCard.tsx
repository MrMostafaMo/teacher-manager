import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DatabaseBackup, Download, HardDrive, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createBackup, restoreFromBackup, liveDbPath } from "@/features/settings/application/settings-cases";
import { liveDbSize } from "@/features/settings/infrastructure/backup-service";
import { toast, useToastStore } from "@/lib/toast-store";

function formatSize(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

export function SettingsDataCard({ onSavedChange }: { onSavedChange?: (s: string) => void }) {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [pathError, setPathError] = useState(false);
  const [dbSize, setDbSize] = useState<number | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);

  const loadPath = useCallback(() => {
    setPathError(false);
    setDbPath(null);
    void liveDbPath()
      .then(setDbPath)
      .catch(() => setPathError(true));
  }, []);
  const loadSize = useCallback(() => {
    setSizeError(false);
    setDbSize(null);
    void liveDbSize()
      .then(setDbSize)
      .catch(() => setSizeError(true));
  }, []);

  useEffect(() => { loadPath(); }, [loadPath]);
  useEffect(() => { loadSize(); }, [loadSize]);

  function notifySaved(msg: string) {
    if (onSavedChange) onSavedChange(msg);
    else push({ message: msg, variant: "success" as const });
  }

  async function handleBackup() {
    if (busy) return;
    setBusy("backup");
    onSavedChange?.("");
    try {
      const r = await createBackup();
      if (r.saved) notifySaved(t("settings.backupDone"));
    } catch (e) {
      console.error("Backup failed", e);
      toast(t("settings.backupError"), "error");
    } finally {
      setBusy(null);
    }
  }
  async function handleRestore() {
    if (busy) return;
    setBusy("restore");
    onSavedChange?.("");
    try {
      const r = await restoreFromBackup(t("settings.restoreConfirm"));
      if (r.status === "done") {
        notifySaved(t("settings.restoreDone"));
        window.setTimeout(() => window.location.reload(), 800);
      } else if (r.status === "error") {
        const key = r.message ?? "restoreError";
        toast(t((key.includes(".") ? key : `settings.${key}`) as never), "error");
      } else if (r.status === "cancelled") toast(t("settings.restoreCancelled"), "error");
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e ?? "");
      toast(raw ? `${t("settings.restoreError")} — ${raw}` : t("settings.restoreError"), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
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
              {pathError ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-destructive text-xs">{t("settings.loadError")}</span>
                  <Button variant="ghost" size="xs" onClick={loadPath}>
                    {t("common.retry")}
                  </Button>
                </span>
              ) : dbPath === null ? (
                <Skeleton className="h-3 w-48" />
              ) : (
                dbPath
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt>{t("settings.dbSize")}</dt>
            <dd className="text-foreground">
              {sizeError ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-destructive text-xs">{t("settings.loadError")}</span>
                  <Button variant="ghost" size="xs" onClick={loadSize}>
                    {t("common.retry")}
                  </Button>
                </span>
              ) : dbSize === null ? (
                <Skeleton className="h-3 w-16" />
              ) : (
                formatSize(dbSize)
              )}
            </dd>
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
  );
}
