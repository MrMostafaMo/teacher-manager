import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { formatDate } from "@/lib/utils/format";
import type { StudentWeakPoint } from "../application/weak-point-cases";

export function WeakPointsTable({
  rows,
  deletingId,
  onEdit,
  onToggleResolved,
  onDelete,
}: {
  rows: StudentWeakPoint[];
  deletingId: string | null;
  onEdit: (row: StudentWeakPoint) => void;
  onToggleResolved: (row: StudentWeakPoint) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const columns = useMemo<DataTableColumn<StudentWeakPoint>[]>(
    () => [
      {
        header: t("weakPoints.description"),
        className: "font-medium",
        render: (r) => r.description,
      },
      {
        header: t("weakPoints.recordedOn"),
        className: "tabular-nums text-muted-foreground",
        render: (r) => <span dir="ltr">{formatDate(r.recordedOn)}</span>,
      },
      {
        header: t("weakPoints.status"),
        render: (r) => (
          <Badge variant={r.resolved ? "secondary" : "destructive"}>
            {r.resolved ? t("weakPoints.resolved") : t("weakPoints.active")}
          </Badge>
        ),
      },
      {
        header: "",
        className: "text-end",
        headerClassName: "text-end",
        render: (r) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label={r.resolved ? t("weakPoints.reopen") : t("weakPoints.markResolved")}
              onClick={() => onToggleResolved(r)}
            >
              {r.resolved ? <RotateCcw className="size-4" /> : <CheckCircle2 className="size-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label={t("weakPoints.edit")}
              onClick={() => onEdit(r)}
            >
              <Pencil className="size-4" />
            </Button>
            <ConfirmDeleteButton
              armed={deletingId === r.id}
              deleteLabel={t("weakPoints.delete")}
              confirmLabel={t("weakPoints.confirmDelete")}
              onDelete={() => onDelete(r.id)}
            />
          </div>
        ),
      },
    ],
    [t, deletingId, onEdit, onToggleResolved, onDelete],
  );
  const getRowKey = useCallback((r: StudentWeakPoint) => r.id, []);
  return <DataTable<StudentWeakPoint> columns={columns} rows={rows} getRowKey={getRowKey} />;
}