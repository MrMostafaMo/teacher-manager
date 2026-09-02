import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { type DataTableColumn } from "@/shared/DataTable";
import { formatDateString, formatDateTime, formatTime } from "@/lib/utils/format";
import { useTimeStore } from "@/lib/time-store";
import { ACTION_KEYS } from "@/lib/activity-log";
import type {
  ProfileExam,
  ProfileSessionAttendance,
} from "@/features/student-profile/application/student-profile-cases";
import { DAY_KEYS, STATUS_BADGE, STATUS_LABEL } from "./profile-constants";

export interface ActivityLogItem {
  id: string;
  action: string;
  createdAt: number;
}

export function useExamColumns(): DataTableColumn<ProfileExam>[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        header: t("profile.columns.title"),
        className: "font-medium",
        render: (e) => e.title,
      },
      {
        header: t("profile.columns.group"),
        className: "text-muted-foreground",
        render: (e) => e.groupName ?? "—",
      },
      {
        header: t("profile.columns.date"),
        className: "text-muted-foreground tabular-nums",
        render: (e) => <span dir="ltr">{e.date ? formatDateString(e.date) : "—"}</span>,
      },
      {
        header: t("profile.columns.score"),
        className: "font-medium tabular-nums",
        render: (e) => (
          <span dir="ltr">
            {e.score === null ? t("exams.ungraded") : `${e.score} / ${e.maxScore}`}
          </span>
        ),
      },
    ],
    [t],
  );
}

export function useSessionColumns(): DataTableColumn<ProfileSessionAttendance>[] {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  return useMemo(
    () => [
      {
        header: t("profile.columns.date"),
        className: "text-muted-foreground tabular-nums",
        render: (r) => <span dir="ltr">{formatDateString(r.date)}</span>,
      },
      {
        header: t("profile.columns.day"),
        className: "text-muted-foreground",
        render: (r) => t(`schedule.days.${DAY_KEYS[r.dayOfWeek] ?? "sun"}`),
      },
      {
        header: t("profile.columns.time"),
        className: "text-muted-foreground tabular-nums",
        render: (r) => (
          <span dir="ltr">
            {formatTime(r.startTime, hour24)} – {formatTime(r.endTime, hour24)}
          </span>
        ),
      },
      {
        header: t("profile.columns.group"),
        className: "text-muted-foreground",
        render: (r) => r.groupName,
      },
      {
        header: t("profile.columns.status"),
        render: (r) => <Badge className={STATUS_BADGE[r.status]}>{t(STATUS_LABEL[r.status])}</Badge>,
      },
    ],
    [hour24, t],
  );
}

export function useProfileActivityColumns(): DataTableColumn<ActivityLogItem>[] {
  const { t } = useTranslation();
  const hour24 = useTimeStore((s) => s.hour24);
  return useMemo(
    () => [
      {
        header: t("profile.columns.time"),
        className: "text-muted-foreground tabular-nums",
        render: (row) => <span dir="ltr">{formatDateTime(row.createdAt, hour24)}</span>,
      },
      {
        header: t("profile.columns.action"),
        render: (row) => t(`activity.actions.${ACTION_KEYS[row.action] ?? "unknown"}`),
      },
    ],
    [hour24, t],
  );
}
