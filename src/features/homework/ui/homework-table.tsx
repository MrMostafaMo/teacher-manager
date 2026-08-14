import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import type { HomeworkListItem } from "@/features/homework/application/homework-cases";
import { formatDateString } from "@/lib/utils/format";

export const HomeworkTable = memo(function HomeworkTable({
  items,
  deletingId,
  onDetail,
  onEdit,
  onDelete,
}: {
  items: HomeworkListItem[];
  deletingId: string | null;
  onDetail: (id: string) => void;
  onEdit: (h: HomeworkListItem) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const columns = useMemo<DataTableColumn<HomeworkListItem>[]>(
    () => [
      {
        header: t("homework.columns.title"),
        className: "font-medium",
        render: (h) => h.title,
      },
      {
        header: t("homework.columns.dueDate"),
        render: (h) => (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground tabular-nums" dir="ltr">
              {formatDateString(h.dueDate)}
            </span>
            {h.overdue && <Badge variant="destructive">{t("homework.statusOverdue")}</Badge>}
          </div>
        ),
      },
      {
        header: t("homework.columns.completion"),
        render: (h) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${h.completion}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums" dir="ltr">
              {h.completion}%
            </span>
          </div>
        ),
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: (h) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => onDetail(h.id)}>
              <Users />
              <span className="sr-only">{t("homework.detail")}</span>
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(h)}>
              <CalendarDays />
              <span className="sr-only">{t("homework.edit")}</span>
            </Button>
            <ConfirmDeleteButton
              armed={deletingId === h.id}
              deleteLabel={t("homework.delete")}
              confirmLabel={t("homework.confirmDelete")}
              onDelete={() => onDelete(h.id)}
            />
          </div>
        ),
      },
    ],
    [t, deletingId, onDetail, onEdit, onDelete],
  );
  const getRowKey = useCallback((h: HomeworkListItem) => h.id, []);
  return <DataTable<HomeworkListItem> columns={columns} rows={items} getRowKey={getRowKey} />;
});
