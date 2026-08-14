import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/DataTable";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import type { Expense } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/utils/format";

export function ExpensesTable({
  rows,
  deletingId,
  onEdit,
  onDelete,
}: {
  rows: Expense[];
  deletingId: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const columns = useMemo<DataTableColumn<Expense>[]>(() => [
    {
      header: t("expenses.date"),
      className: "tabular-nums text-muted-foreground",
      render: (r) => <span dir="ltr">{formatDate(r.spentAt, "DD-MM-YYYY")}</span>,
    },
    {
      header: t("expenses.title"),
      className: "font-medium",
      render: (r) => r.title,
    },
    {
      header: t("expenses.category"),
      render: (r) => (
        <Badge variant="secondary">{t(`expenses.categories.${r.category}`)}</Badge>
      ),
    },
    {
      header: t("expenses.amount"),
      className: "tabular-nums",
      render: (r) => <span dir="ltr">{formatMoney(r.amount)}</span>,
    },
    {
      header: t("expenses.note"),
      className: "max-w-48 truncate text-muted-foreground",
      render: (r) => r.note ?? "—",
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
            aria-label={t("expenses.edit")}
            onClick={() => onEdit(r)}
          >
            <Pencil className="size-4" />
          </Button>
          <ConfirmDeleteButton
            armed={deletingId === r.id}
            deleteLabel={t("expenses.delete")}
            confirmLabel={t("expenses.confirmDelete")}
            onDelete={() => onDelete(r.id)}
          />
        </div>
      ),
    },
  ], [t, deletingId, onEdit, onDelete]);
  const getRowKey = useCallback((r: Expense) => r.id, []);
  return <DataTable<Expense> columns={columns} rows={rows} getRowKey={getRowKey} />;
}
