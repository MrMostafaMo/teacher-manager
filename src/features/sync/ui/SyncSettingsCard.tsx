import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, CloudUpload, Download, LogOut, RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToastStore } from "@/lib/toast-store";
import { useTimeStore } from "@/lib/time-store";
import { formatDateTime } from "@/lib/utils/format";
import { cloudBackupDatabase, cloudRestoreDatabase } from "../application/backup-cases";
import { connectAccount, disconnectAccount } from "../application/sync-session";
import { deviceName } from "../application/sync-cases";
import { OAuthCancelError } from "../application/oauth-cases";
import { runManualSync, refreshSyncUi } from "./sync-events";
import { useSyncStore } from "./sync-store";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { ClientIdGuide } from "./ClientIdGuide";

/**
 * Settings card for Google sync: connect (user-supplied client id), manual
 * sync, cloud backup/restore, and disconnect.
 */

const CLIENT_ID_PATTERN = /^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/;

export function SyncSettingsCard() {
  const { t } = useTranslation();
  const toast = useToastStore((s) => s.push);
  const hour24 = useTimeStore((s) => s.hour24);
  const { busy, clientId, accountEmail, lastSyncAt } = useSyncStore();
  const [connecting, setConnecting] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  useEffect(() => {
    void refreshSyncUi();
  }, []);

  async function handleConnect() {
    const id = clientId?.trim() ?? "";
    if (!CLIENT_ID_PATTERN.test(id)) {
      toast({ message: t("sync.settings.invalidClientId"), variant: "error" });
      return;
    }
    setConnecting(true);
    try {
      await connectAccount(id);
      await refreshSyncUi();
      toast({ message: t("sync.settings.connected"), variant: "success" });
    } catch (error) {
      if (error instanceof OAuthCancelError) {
        toast({ message: t("sync.settings.cancelError"), variant: "info" });
      } else {
        console.error("Sign-in failed", error);
        toast({ message: t("sync.settings.connectError"), variant: "error" });
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    await disconnectAccount();
    await refreshSyncUi();
    toast({ message: t("sync.settings.disconnected"), variant: "info" });
  }

  async function handleAction(key: string, run: () => Promise<unknown>) {
    if (action !== null) return;
    setAction(key);
    try {
      const result = await run();
      if (result === null || typeof result !== "object") return;
      if ("status" in result) {
        const { status, message } = result as { status: string; message?: string };
        if (status === "ok" || status === "done") {
          toast({ message: t(`sync.settings.${key}Done`), variant: "success" });
        } else if (status === "notFound") {
          toast({ message: t("sync.settings.noBackups"), variant: "info" });
        } else {
          toast({ message: t(`sync.settings.${message ?? "backupError"}`), variant: "error" });
        }
      } else if ("error" in result) {
        const { error } = result as { error: string | null };
        toast(
          error === null
            ? { message: t("sync.settings.syncDone"), variant: "success" }
            : { message: t(error), variant: "error" },
        );
      }
    } catch (error) {
      console.error(key, error);
      toast({ message: t("sync.settings.operationError"), variant: "error" });
    } finally {
      setAction(null);
    }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Cloud className="size-4" />
          {t("sync.settings.title")}
        </div>

        {accountEmail === null ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("sync.settings.hint")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={clientId ?? ""}
                onChange={(e) => useSyncStore.getState().setClientId(e.target.value)}
                placeholder={t("sync.settings.clientIdPlaceholder")}
                dir="ltr"
                className="flex-1"
              />
              <GoogleSignInButton
                onClick={() => void handleConnect()}
                busy={connecting}
                disabled={!CLIENT_ID_PATTERN.test((clientId ?? "").trim())}
              />
            </div>
            {!CLIENT_ID_PATTERN.test((clientId ?? "").trim()) && (
              <p className="text-xs text-muted-foreground">{t("sync.settings.clientIdDisabledHint")}</p>
            )}
            <ClientIdGuide />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium" dir="ltr">
                {accountEmail}
              </span>
              {lastSyncAt !== null && (
                <span className="text-xs text-muted-foreground">
                  {t("sync.status.lastSync")}: {formatDateTime(lastSyncAt, hour24)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void handleAction("sync", runManualSync)} disabled={busy || action !== null}>
                <RefreshCw className={busy ? "animate-spin" : ""} />
                {t("sync.settings.syncNow")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void handleAction("backup", async () => cloudBackupDatabase(await deviceName()))
                }
                disabled={busy || action !== null}
              >
                <CloudUpload />
                {t("sync.settings.cloudBackup")}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void handleAction("restore", async () =>
                    cloudRestoreDatabase(async () => window.confirm(t("sync.settings.restoreConfirm"))),
                  )
                }
                disabled={busy || action !== null}
              >
                <Download />
                {t("sync.settings.cloudRestore")}
              </Button>
              <Button variant="ghost" onClick={() => void handleDisconnect()}>
                <LogOut />
                {t("sync.settings.disconnect")}
              </Button>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Upload className="size-3.5" />
              {t("sync.settings.autoHint")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}