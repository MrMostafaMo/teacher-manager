import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TableRowsSkeleton } from "@/shared/Skeletons";
import { PageHeader } from "@/shared/PageHeader";
import { EmptyState } from "@/shared/EmptyState";
import {
  deleteExpense,
  listExpenses,
} from "@/features/expenses/application/expense-cases";
import type { Expense } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { RecordExpenseDialog } from "./RecordExpenseDialog";
import { MonthPicker } from "@/shared/DatePicker";

const inputClass =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring";

export default function ExpensesPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const bump = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);
    setError("");
    listExpenses(month)
      .then(setRows)
      .catch((e) => {
        console.error("Failed to load expenses", e);
        setError(t("expenses.loadError"));
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [month, reloadKey, t]);

  async function handleDelete(id: string) {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId((cur) => (cur === id ? null : cur)), 2500);
      return;
    }
    try {
      await deleteExpense(id);
      setDeletingId(null);
      bump();
    } catch (e) {
      console.error("Failed to delete expense", e);
      setError(t("expenses.deleteError"));
    }
  }

  const total = rows.reduce((acc, r) => acc + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.expenses")}
        description={t("expenses.subtitle")}
        actions={
          <Button onClick={() => {
            setEditing(null);
            setRecordOpen(true);
          }}>
            <Plus />
            {t("expenses.record")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("expenses.month")}
          <MonthPicker
            value={month}
            onChange={(v) => v && setMonth(v)}
            ariaLabel={t("expenses.month")}
            className={inputClass}
          />
        </label>
        <Badge variant="secondary">
          <Receipt className="size-3.5" />
          {t("expenses.total")}: {formatMoney(total)}
        </Badge>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <TableRowsSkeleton rows={5} cols={4} />
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={Receipt} title={t("expenses.empty")} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 text-start font-medium">{t("expenses.date")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("expenses.title")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("expenses.category")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("expenses.amount")}</th>
                    <th className="px-4 py-2.5 text-start font-medium">{t("expenses.note")}</th>
                    <th className="px-4 py-2.5 text-start font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-2.5 tabular-nums text-muted-foreground" dir="ltr">
                        {formatDate(r.spentAt, "DD-MM-YYYY")}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{r.title}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary">{t(`expenses.categories.${r.category}`)}</Badge>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums" dir="ltr">
                        {formatMoney(r.amount)}
                      </td>
                      <td className="max-w-48 truncate px-4 py-2.5 text-muted-foreground">
                        {r.note ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground"
                            aria-label={t("expenses.edit")}
                            onClick={() => {
                              setEditing(r);
                              setRecordOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {deletingId === r.id ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleDelete(r.id)}
                            >
                              {t("expenses.confirmDelete")}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              aria-label={t("expenses.delete")}
                              onClick={() => void handleDelete(r.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
