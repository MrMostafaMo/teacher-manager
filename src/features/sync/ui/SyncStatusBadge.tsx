import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, CloudOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncStore } from "./sync-store";
import { SyncReportDialog } from "./SyncReportDialog";

/**
 * Header badge: connection state + last sync time. Clicking opens the report
 * dialog for the last round (manual or auto).
 */

export function SyncStatusBadge() {
  const { t } = useTranslation();
  const { busy, accountEmail, lastSyncAt, lastReport } = useSyncStore();
  const [open, setOpen] = useState(false);

  const connected = accountEmail !== null;
  const label = busy
    ? t("sync.status.syncing")
    : connected
      ? accountEmail
      : t("sync.status.off");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5"
        onClick={() => setOpen(true)}
        disabled={!connected && !busy}
        aria-label={label}
        title={lastSyncAt !== null ? t("sync.status.lastSync") : undefined}
      >
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : connected ? (
          <Cloud className="size-3.5 text-primary" />
        ) : (
          <CloudOff className="size-3.5 text-muted-foreground" />
        )}
        <span className="max-w-28 truncate text-xs">{label}</span>
      </Button>
      <SyncReportDialog open={open} report={lastReport} onClose={() => setOpen(false)} />
    </>
  );
}