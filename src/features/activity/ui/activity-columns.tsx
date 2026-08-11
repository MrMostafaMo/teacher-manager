import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AppWindow } from "lucide-react";
import { type DataTableColumn } from "@/shared/DataTable";
import { formatDateTime } from "@/lib/utils/format";
import { ACTION_KEYS, type ActivityLogRow } from "@/lib/activity-log";
import { ENTITY_ICONS, detailsParts } from "./activity-presentation";

export function useActivityColumns(names: Map<string, string>, hour24: boolean) {
  const { t } = useTranslation();
  return useMemo<DataTableColumn<ActivityLogRow>[]>(
    () => [
      {
        header: t("activity.columns.time"),
        className: "whitespace-nowrap tabular-nums text-muted-foreground",
        render: (row) => <span dir="ltr">{formatDateTime(row.createdAt, hour24)}</span>,
      },
      {
        header: t("activity.columns.action"),
        render: (row) => {
          const Icon = ENTITY_ICONS[row.entityType] ?? AppWindow;
          const labelKey = ACTION_KEYS[row.action];
          return (
            <span className="flex items-center gap-2">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">
                {t(labelKey ? `activity.actions.${labelKey}` : "activity.actions.unknown")}
              </span>
            </span>
          );
        },
      },
      {
        header: t("activity.columns.details"),
        className: "text-muted-foreground",
        render: (row) => {
          const parts = detailsParts(row, names);
          return parts.length > 0 ? parts.join(" · ") : "—";
        },
      },
    ],
    [t, hour24, names],
  );
}
