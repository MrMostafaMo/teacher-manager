import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paymentInputSchema } from "@/features/payments/domain";
import { listPlans } from "@/features/payments/application/plan-cases";
import { recordPayment, updatePayment } from "@/features/payments/application/payment-cases";
import { listStudents } from "@/features/students/application/student-cases";
import { MonthPicker } from "@/shared/DatePicker";
import type { Payment, Plan, Student } from "@/lib/db/schema";
import { Modal } from "@/features/students/ui/Modal";
import { formatMoney } from "@/lib/utils/format";

interface RecordPaymentDialogProps {
  open: boolean;
  defaultPeriod: string;
  payment?: Payment | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  studentId: string;
  planId: string;
  amount: string;
  period: string;
  method: "cash" | "card" | "transfer";
  note: string;
}

export function RecordPaymentDialog({
  open,
  defaultPeriod,
  payment,
  onClose,
  onSaved,
}: RecordPaymentDialogProps) {
  const { t } = useTranslation();
  const [students, setStudents] = useState<Student[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm(defaultPeriod));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(payment ? formFromPayment(payment) : emptyForm(defaultPeriod));
    setErrors({});
    setFatal("");
    void listStudents({ status: "active" })
      .then(setStudents)
      .catch(() => setStudents([]));
    void listPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [open, defaultPeriod, payment]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleStudentChange(studentId: string) {
    const student = students.find((s) => s.id === studentId);
    const plan = student?.planId ? plans.find((p) => p.id === student.planId) : undefined;
    setForm((f) => ({
      ...f,
      studentId,
      planId: plan?.id ?? "",
      amount: plan ? String(plan.amount) : f.amount,
    }));
  }

  function handlePlanChange(planId: string) {
    const plan = plans.find((p) => p.id === planId);
    setForm((f) => ({ ...f, planId, amount: plan ? String(plan.amount) : f.amount }));
  }

  function mapErrors(error: ZodError): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "");
      if (mapped[field]) continue;
      if (field === "amount") mapped[field] = t("payments.errors.amountInvalid");
      else if (field === "studentId") mapped[field] = t("payments.errors.studentRequired");
      else mapped[field] = t("payments.errors.invalid");
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
        studentId: form.studentId,
        planId: form.planId,
        amount: Number(form.amount),
        period: form.period,
        method: form.method,
        note: form.note,
      };
      paymentInputSchema.parse(input);
      if (payment) await updatePayment(payment.id, input);
      else await recordPayment(input);
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
    <Modal open={open} onClose={onClose} title={payment ? t("payments.edit") : t("payments.record")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="payment-student">
            {t("payments.student")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="payment-student"
            value={form.studentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            aria-invalid={!!errors.studentId}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
          >
            <option value="">{t("payments.studentPlaceholder")}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.studentId && <p className="text-xs text-destructive">{errors.studentId}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payment-plan">{t("payments.plan")}</Label>
            <select
              id="payment-plan"
              value={form.planId}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
            >
              <option value="">{t("payments.noPlan")}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.amount)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-amount">
              {t("payments.amount")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="payment-amount"
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payment-period">{t("payments.period")}</Label>
            <MonthPicker
              value={form.period}
              onChange={(v) => v && setField("period", v)}
              ariaLabel={t("payments.period")}
              className="w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payment-method">{t("payments.method")}</Label>
            <select
              id="payment-method"
              value={form.method}
              onChange={(e) => setField("method", e.target.value as FormState["method"])}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
            >
              <option value="cash">{t("payments.cash")}</option>
              <option value="card">{t("payments.card")}</option>
              <option value="transfer">{t("payments.transfer")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payment-note">{t("payments.note")}</Label>
          <textarea
            id="payment-note"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring placeholder:text-muted-foreground dark:bg-muted/50"
          />
        </div>

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("payments.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("payments.saving") : t("payments.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function emptyForm(period: string): FormState {
  return { studentId: "", planId: "", amount: "", period, method: "cash", note: "" };
}

function formFromPayment(payment: Payment): FormState {
  return {
    studentId: payment.studentId,
    planId: payment.planId ?? "",
    amount: String(payment.amount),
    period: payment.period ?? "",
    method: payment.method ?? "cash",
    note: payment.note ?? "",
  };
}
