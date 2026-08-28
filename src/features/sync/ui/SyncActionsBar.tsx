import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CloudUpload, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/lib/toast-store";
import { cloudBackupDatabase, cloudRestoreDatabase } from "../application/backup-cases";
import { deviceName } from "../application/sync-cases";
import { syncAll } from "../application/sync-orchestrator";
import { useSyncStore } from "./sync-store";

export function SyncActionsBar() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const { busy } = useSyncStore();
  const [action, setAction] = useState<string | null>(null);
  const disabled = busy || action !== null;

  async function handleSync() {
    if (disabled) return;
    setAction("sync");
    useSyncStore.getState().setBusy(true);
    try {
      const r = await syncAll("manual");
      useSyncStore.getState().setLastReport(r);
      useSyncStore.getState().setError(r.error);
      if (r.error === null) {
        useSyncStore.getState().setLastSyncAt(r.at);
        toast({ message: t("sync.settings.syncDone"), variant: "success" });
      } else toast({ message: t(r.error), variant: "error" });
    } finally {
      useSyncStore.getState().setBusy(false);
      setAction(null);
    }
  }

  async function handleAction(key: string, run: () => Promise<unknown>) {
    if (action) return;
    setAction(key);
    try {
      const res = (await run()) as { status?: string; message?: string } | null;
      if (!res || typeof res !== "object") return;
      const { status, message } = res as { status: string; message?: string };
      if (status === "ok" || status === "done") toast({ message: t(`sync.settings.${key}Done`), variant: "success" });
      else if (status === "notFound") toast({ message: t("sync.settings.noBackups"), variant: "info" });
      else if (status === "cancelled") return;
      else {
        const keyOrMsg = message ?? "backupError";
        const fullKey = keyOrMsg.includes(".") ? keyOrMsg : `sync.settings.${keyOrMsg}`;
        toast({ message: t(fullKey), variant: "error" });
      }
    } catch (e) {
      const raw = e instanceof Error ? e.message : "";
      toast({ message: raw ? `${t("sync.settings.operationError")} — ${raw}` : t("sync.settings.operationError"), variant: "error" });
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="rounded-xl bg-muted/40 p-2 ring-1 ring-border/50">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => void handleSync()} disabled={disabled} className="gap-2 shadow-[var(--primary-shadow)]">
          <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
          {t("sync.settings.syncNow")}
        </Button>
        <div className="ms-auto flex gap-2">
          <Button variant="outline" className="bg-card/70 backdrop-blur-sm" onClick={() => void handleAction("backup", async () => cloudBackupDatabase(await deviceName()))} disabled={disabled}>
            <CloudUpload className="size-4" />
            {t("sync.settings.cloudBackup")}
          </Button>
          <Button variant="outline" className="bg-card/70 backdrop-blur-sm" onClick={() => void handleAction("restore", async () => cloudRestoreDatabase(async () => window.confirm(t("sync.settings.restoreConfirm"))))} disabled={disabled}>
            <Download className="size-4" />
            {t("sync.settings.cloudRestore")}
          </Button>
        </div>
      </div>
      {busy && <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] bg-[linear-gradient(90deg,var(--primary),var(--primary-strong))]" /></div>}
    </div>
  );
}
