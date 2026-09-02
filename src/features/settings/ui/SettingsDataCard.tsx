import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, DatabaseBackup, Download, HardDrive, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsCardShell } from "@/shared/SettingsCardShell";
import { createBackup, restoreFromBackup } from "@/features/settings/application/settings-cases";
import { toast, useToastStore } from "@/lib/toast-store";
import { formatSize, useDbInfo } from "./settings-data-helpers";

export function SettingsDataCard({ onSavedChange }: { onSavedChange?: (s: string) => void }) {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  const { dbPath, pathError, dbSize, sizeError, loadPath, loadSize } = useDbInfo();
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

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

  async function copyPath() {
    if (!dbPath) return;
    try {
      await navigator.clipboard.writeText(dbPath);
      setCopied(true);
    } catch {
      toast(t("common.copyError"), "error");
    }
  }

  return (
    <SettingsCardShell icon={HardDrive} title={t("settings.data")} description={t("settings.backupHint")}>
      <div className="space-y-3">
        <div className="rounded-xl bg-muted/40 p-3 ring-1 ring-border/50">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{t("settings.dbPath")}</span>
            {dbPath && (
              <Button variant="ghost" size="xs" className="h-6 gap-1 text-xs" onClick={() => void copyPath()}>
                <Copy className="size-3" />
                {copied ? t("common.copied") : t("common.copy")}
              </Button>
            )}
          </div>
          <div className="mt-1.5 rounded-lg bg-card px-3 py-2 font-mono text-xs break-all ring-1 ring-border" dir="ltr">
            {pathError ? (
              <span className="flex items-center gap-1.5">
                <span className="text-destructive text-xs">{t("settings.loadError")}</span>
                <Button variant="ghost" size="xs" onClick={loadPath}>{t("common.retry")}</Button>
              </span>
            ) : dbPath === null ? (
              <Skeleton className="h-3 w-48" />
            ) : (
              dbPath
            )}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t("settings.dbSize")}</span>
            <span className="rounded-full bg-card px-2.5 py-1 text-xs font-medium tabular-nums ring-1 ring-border">
              {sizeError ? (
                <span className="flex items-center gap-1">
                  <span className="text-destructive">{t("settings.loadError")}</span>
                  <Button variant="ghost" size="xs" onClick={loadSize}>{t("common.retry")}</Button>
                </span>
              ) : dbSize === null ? (
                <Skeleton className="h-3 w-12" />
              ) : (
                formatSize(dbSize)
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void handleBackup()} disabled={busy !== null} className="gap-1.5">
            <Download className="size-4" />
            {busy === "backup" ? t("settings.backingUp") : t("settings.backupAction")}
          </Button>
          <Button variant="outline" onClick={() => void handleRestore()} disabled={busy !== null} className="gap-1.5">
            <Upload className="size-4" />
            {busy === "restore" ? t("settings.restoring") : t("settings.restoreAction")}
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><DatabaseBackup className="size-3.5" />{t("settings.backupHint")}</span>
          <span className="flex items-center gap-1.5"><RotateCcw className="size-3.5" />{t("settings.restoreHint")}</span>
        </div>
      </div>
    </SettingsCardShell>
  );
}
