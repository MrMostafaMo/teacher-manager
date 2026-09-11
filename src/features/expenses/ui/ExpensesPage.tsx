import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Plus, Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import { deleteExpense, listExpenses } from "@/features/expenses/application/expense-cases";
import type { Expense } from "@/lib/db/schema";
import { formatMoney } from "@/lib/utils/format";
import { RecordExpenseDialog } from "./RecordExpenseDialog";
import { MonthPicker } from "@/shared/month-picker";
import { SELECT_CLASS as inputClass } from "@/shared/picker-shared";
import { useConfirmDelete } from "@/shared/useConfirmDelete";
import { useDataChanged } from "@/shared/useDataChanged";
import { notifyUndo } from "@/lib/undo-store";
import { ExpensesTable } from "./expenses-table";
import { ExpenseCategoryChart } from "./expense-category-chart";
import { toast } from "@/lib/toast-store";

/** Above this many rows the table pages server-side (badge/chart stay global). */
const PAGED_LIMIT = 300;
const PAGE_SIZE = 50;

export default function ExpensesPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [rows, setRows] = useState<Expense[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const { armed: deletingId, request, clear } = useConfirmDelete();
  const [reloadKey, setReloadKey] = useState(0);
  // Single fetch: badge + chart need the full month anyway, so the table
  // slices the same rows instead of firing a second identical scan.
  const paged = rows.length > PAGED_LIMIT;
  const tableRows = paged ? rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : rows;

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  useDataChanged(bump);

  useEffect(() => {
    setPage(0);
  }, [month, reloadKey]);

  useEffect(() => {
    setLoading(true);
    listExpenses(month)
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load expenses", e);
        toast(t("expenses.loadError"), "error");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [month, reloadKey, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!request(id)) return;
      try {
        const row = rows.find((r) => r.id === id);
        const undoId = await deleteExpense(id);
        clear();
        bump();
        if (undoId !== null && row) {
          notifyUndo(
            undoId,
            t("undo.deleted"),
            `${t("undo.expense")}: ${row.title}`,
            t("undo.undo"),
          );
        }
      } catch (e) {
        console.error("Failed to delete expense", e);
        toast(t("expenses.deleteError"), "error");
      }
    },
    [request, clear, bump, rows, t],
  );

  const total = rows.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.expenses")}
        description={t("expenses.subtitle")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setRecordOpen(true);
            }}
          >
            <Plus />
            {t("expenses.record")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("expenses.month")}
          <MonthPicker
            value={month}
            onChange={(v) => setMonth(v || dayjs().format("YYYY-MM"))}
            ariaLabel={t("expenses.month")}
            className={inputClass}
          />
        </div>
        <Badge variant="secondary">
          <Receipt className="size-3.5" />
          {t("expenses.total")}: {formatMoney(total)}
        </Badge>
      </div>

      {rows.length > 0 && <ExpenseCategoryChart rows={rows} />}

      {loading && rows.length === 0 ? (
        <TableRowsSkeleton rows={5} cols={4} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Receipt}
              title={t("expenses.empty")}
              action={
                <Button onClick={() => setRecordOpen(true)}>
                  <Plus />
                  {t("expenses.record")}
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ExpensesTable
              rows={tableRows}
              deletingId={deletingId}
              onEdit={(r) => {
                setEditing(r);
                setRecordOpen(true);
              }}
              onDelete={(id) => void handleDelete(id)}
              pager={
                paged
                  ? { page, total: rows.length, pageSize: PAGE_SIZE, onPageChange: setPage }
                  : undefined
              }
            />
          </CardContent>
        </Card>
      )}

      <RecordExpenseDialog
        open={recordOpen}
        expense={editing}
        onClose={() => {
          setRecordOpen(false);
          setEditing(null);
        }}
        onSaved={bump}
      />
    </div>
  );
}
