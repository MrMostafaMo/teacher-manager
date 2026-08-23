import { memo, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import type { ExamListItem } from "@/features/exams/application/exam-cases";
import { formatDateString } from "@/lib/utils/format";

export const ExamsTable = memo(function ExamsTable({
  items,
  deletingId,
  onDetail,
  onEdit,
  onDelete,
}: {
  items: ExamListItem[];
  deletingId: string | null;
  onDetail: (id: string) => void;
  onEdit: (e: ExamListItem) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const columns = useMemo<DataTableColumn<ExamListItem>[]>(
    () => [
      {
        header: t("exams.columns.title"),
        className: "font-medium",
        render: (e) => e.title,
      },
      {
        header: t("exams.columns.date"),
        className: "text-muted-foreground tabular-nums",
        render: (e) => <span dir="ltr">{formatDateString(e.date)}</span>,
      },
      {
        header: t("exams.columns.maxScore"),
        className: "text-muted-foreground tabular-nums",
        render: (e) => <span dir="ltr">{e.maxScore}</span>,
      },
      {
        header: t("exams.columns.completion"),
        render: (e) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-success"
                style={{ width: `${e.completion}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums" dir="ltr">
              {e.completion}%
            </span>
          </div>
        ),
      },
      {
        header: t("exams.columns.average"),
        className: "text-muted-foreground tabular-nums",
        render: (e) => <span dir="ltr">{e.average ?? "—"}</span>,
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: (e) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => onDetail(e.id)}>
              <Users />
              <span className="sr-only">{t("exams.detail")}</span>
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(e)}>
              <Pencil />
              <span className="sr-only">{t("exams.edit")}</span>
            </Button>
            <ConfirmDeleteButton
              armed={deletingId === e.id}
              deleteLabel={t("exams.delete")}
              confirmLabel={t("exams.confirmDelete")}
              onDelete={() => onDelete(e.id)}
            />
          </div>
        ),
      },
    ],
    [t, deletingId, onDetail, onEdit, onDelete],
  );
  const getRowKey = useCallback((e: ExamListItem) => e.id, []);
  return <DataTable<ExamListItem> columns={columns} rows={items} getRowKey={getRowKey} />;
});
