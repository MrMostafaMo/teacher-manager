import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Cloud, CloudOff, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { Avatar } from "@/shared/Avatar";
import { useTeacherProfile } from "@/features/teacher-profile/application/use-teacher-profile";
import { useSyncStore } from "./sync-store";
import { SyncReportDialog } from "./SyncReportDialog";

export function SyncStatusBadge() {
  const { t } = useTranslation();
  const { busy, supabaseEmail, lastSyncAt, lastReport } = useSyncStore();
  const { name } = useTeacherProfile();
  const [open, setOpen] = useState(false);

  const connected = supabaseEmail !== null;
  const displayName = name ? t("teacher.display", { name }) : null;
  const hasError = !busy && typeof lastReport?.error === "string";
  const label = busy ? t("sync.status.syncing") : hasError ? t(lastReport!.error as string) : connected ? (displayName ?? supabaseEmail!) : t("sync.status.off");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`h-8 gap-1.5 ${hasError ? "border-destructive/40 text-destructive hover:bg-destructive/10" : ""}`}
        onClick={() => setOpen(true)}
        disabled={!connected && !busy && !hasError}
        aria-label={label}
        title={lastSyncAt !== null ? `${t("sync.status.lastSync")}: ${formatDate(lastSyncAt, "DD-MM-YYYY HH:mm")}` : undefined}
      >
        {busy ? (
          <LoaderCircle className="size-3.5 animate-spin" />
        ) : hasError ? (
          <AlertTriangle className="size-3.5 text-destructive" />
        ) : connected && displayName ? (
          <Avatar name={name!} className="size-5 text-[10px]" />
        ) : connected ? (
          <Cloud className="size-3.5 text-primary" />
        ) : (
          <CloudOff className="size-3.5 text-muted-foreground" />
        )}
        <span className="max-w-36 truncate text-xs">{label}</span>
      </Button>
      <SyncReportDialog open={open} report={lastReport} onClose={() => setOpen(false)} />
    </>
  );
}
