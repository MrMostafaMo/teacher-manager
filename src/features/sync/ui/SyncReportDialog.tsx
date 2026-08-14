import { useTranslation } from "react-i18next";
import { Cloud } from "lucide-react";
import { Modal } from "@/shared/Modal";
import { useTimeStore } from "@/lib/time-store";
import { formatDateTime } from "@/lib/utils/format";
import type { SyncReport } from "../application/sync-report";

/**
 * Modal summarizing the last sync round: per-table applied/deleted/pushed
 * counts, pushed tombstones, and any error that aborted the round.
 */

interface SyncReportDialogProps {
  open: boolean;
  report: SyncReport | null;
  onClose: () => void;
}

export function SyncReportDialog({ open, report, onClose }: SyncReportDialogProps) {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  const entries = Object.entries(report?.tables ?? {});

  return (
    <Modal
      open={open}
      title={t("sync.report.title")}
      description={report === null ? undefined : formatDateTime(report.at, hour24)}
      onClose={onClose}
    >
      {report === null ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("sync.report.none")}</p>
      ) : report.error !== null ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">{t(report.error)}</p>
          <p className="text-xs text-muted-foreground">{t("sync.report.errorHint")}</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Cloud className="size-8" />
          <p className="text-sm">{t("sync.report.uptoDate")}</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 text-start font-medium">{t("sync.report.table")}</th>
              <th className="py-1.5 text-end font-medium">{t("sync.report.applied")}</th>
              <th className="py-1.5 text-end font-medium">{t("sync.report.deleted")}</th>
              <th className="py-1.5 text-end font-medium">{t("sync.report.pushed")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([name, counts]) => (
              <tr key={name} className="border-b last:border-0">
                <td className="py-1.5">{t(`sync.tables.${name}`)}</td>
                <td className="py-1.5 text-end tabular-nums">{counts.applied}</td>
                <td className="py-1.5 text-end tabular-nums">{counts.deleted}</td>
                <td className="py-1.5 text-end tabular-nums">{counts.pushed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {report !== null && report.error === null && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("sync.report.tombstones", { count: report.pushedTombstones })}
        </p>
      )}
    </Modal>
  );
}