import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/shared/Modal";
import { expenseCategorySchema, expenseInputSchema } from "@/features/expenses/domain";
import { recordExpense, updateExpense } from "@/features/expenses/application/expense-cases";
import type { Expense } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { DatePicker } from "@/shared/DatePicker";
import { Field } from "@/shared/Field";

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

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (field) =>
      field === "title"
        ? t("expenses.errors.titleRequired")
        : field === "amount"
          ? t("expenses.errors.amountInvalid")
          : t("expenses.errors.invalid"),
    );

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
        <Field id="expense-title" label={t("expenses.title")} required error={errors.title}>
          <Input
            id="expense-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            aria-invalid={!!errors.title}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="expense-category" label={t("expenses.category")} required>
            <Select
              id="expense-category"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
            >
              {expenseCategorySchema.options.map((c) => (
                <option key={c} value={c}>
                  {t(`expenses.categories.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="expense-amount" label={t("expenses.amount")} required error={errors.amount}>
            <Input
              id="expense-amount"
              dir="ltr"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              aria-invalid={!!errors.amount}
            />
          </Field>
        </div>

        <Field id="expense-date" label={t("expenses.date")}>
          <DatePicker
            value={form.date}
            onChange={(v) => v && setField("date", v)}
            ariaLabel={t("expenses.date")}
            className="w-full"
          />
        </Field>

        <Field id="expense-note" label={t("expenses.note")}>
          <Textarea
            id="expense-note"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
          />
        </Field>

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
