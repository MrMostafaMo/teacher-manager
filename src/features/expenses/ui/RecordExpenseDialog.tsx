import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/features/students/ui/Modal";
import { expenseCategorySchema, expenseInputSchema } from "@/features/expenses/domain";
import { recordExpense, updateExpense } from "@/features/expenses/application/expense-cases";
import type { Expense } from "@/lib/db/schema";
import { DatePicker } from "@/shared/DatePicker";

interface RecordExpenseDialogProps {
  open: boolean;
  expense?: Expense | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  title: string;
  category: string;
  amount: string;
  date: string;
  note: string;
}

export function RecordExpenseDialog({ open, expense, onClose, onSaved }: RecordExpenseDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(expense ? formFromExpense(expense) : emptyForm());
    setErrors({});
    setFatal("");
  }, [open, expense]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function mapErrors(error: ZodError): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "");
      if (mapped[field]) continue;
      if (field === "title") mapped[field] = t("expenses.errors.titleRequired");
      else if (field === "amount") mapped[field] = t("expenses.errors.amountInvalid");
      else mapped[field] = t("expenses.errors.invalid");
    }
    return mapped;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFatal("");
    try {
      const input = {
        title: form.title,
        category: expenseCategorySchema.parse(form.category),
        amount: Number(form.amount),
        note: form.note,
        spentAt: dayjs(form.date).startOf("day").valueOf(),
      };
      expenseInputSchema.parse(input);
      if (expense) await updateExpense(expense.id, input);
      else await recordExpense(input);
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ZodError) setErrors(mapErrors(error));
      else setFatal(String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={expense ? t("expenses.edit") : t("expenses.record")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="expense-title">
            {t("expenses.title")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="expense-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="expense-category">
              {t("expenses.category")} <span className="text-destructive">*</span>
            </Label>
            <select
              id="expense-category"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
            >
              {expenseCategorySchema.options.map((c) => (
                <option key={c} value={c}>
                  {t(`expenses.categories.${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-amount">
              {t("expenses.amount")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="expense-amount"
              dir="ltr"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expense-date">{t("expenses.date")}</Label>
          <DatePicker
            value={form.date}
            onChange={(v) => v && setField("date", v)}
            ariaLabel={t("expenses.date")}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="expense-note">{t("expenses.note")}</Label>
          <textarea
            id="expense-note"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring placeholder:text-muted-foreground dark:bg-muted/50"
          />
        </div>

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("expenses.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("expenses.saving") : t("expenses.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function emptyForm(): FormState {
  return {
    title: "",
    category: "other",
    amount: "",
    date: dayjs().format("YYYY-MM-DD"),
    note: "",
  };
}

function formFromExpense(expense: Expense): FormState {
  return {
    title: expense.title,
    category: expense.category,
    amount: String(expense.amount),
    date: dayjs(expense.spentAt).format("YYYY-MM-DD"),
    note: expense.note ?? "",
  };
}
