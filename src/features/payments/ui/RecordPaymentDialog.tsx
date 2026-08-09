import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { paymentInputSchema } from "@/features/payments/domain";
import { listPlans } from "@/features/payments/application/plan-cases";
import { recordPayment, updatePayment } from "@/features/payments/application/payment-cases";
import { listStudents } from "@/features/students/application/student-cases";
import { MonthPicker } from "@/shared/DatePicker";
import type { Payment, Plan, Student } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { Modal } from "@/shared/Modal";
import { formatMoney } from "@/lib/utils/format";
import { Field } from "@/shared/Field";

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

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (field) =>
      field === "amount"
        ? t("payments.errors.amountInvalid")
        : field === "studentId"
          ? t("payments.errors.studentRequired")
          : t("payments.errors.invalid"),
    );

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
        <Field id="payment-student" label={t("payments.student")} required error={errors.studentId}>
          <Select
            id="payment-student"
            value={form.studentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            aria-invalid={!!errors.studentId}
          >
            <option value="">{t("payments.studentPlaceholder")}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="payment-plan" label={t("payments.plan")}>
            <Select
              id="payment-plan"
              value={form.planId}
              onChange={(e) => handlePlanChange(e.target.value)}
            >
              <option value="">{t("payments.noPlan")}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.amount)}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="payment-amount" label={t("payments.amount")} required error={errors.amount}>
            <Input
              id="payment-amount"
              dir="ltr"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              aria-invalid={!!errors.amount}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="payment-period" label={t("payments.period")}>
            <MonthPicker
              value={form.period}
              onChange={(v) => v && setField("period", v)}
              ariaLabel={t("payments.period")}
              className="w-full"
            />
          </Field>
          <Field id="payment-method" label={t("payments.method")}>
            <Select
              id="payment-method"
              value={form.method}
              onChange={(e) => setField("method", e.target.value as FormState["method"])}
            >
              <option value="cash">{t("payments.cash")}</option>
              <option value="card">{t("payments.card")}</option>
              <option value="transfer">{t("payments.transfer")}</option>
            </Select>
          </Field>
        </div>

        <Field id="payment-note" label={t("payments.note")}>
          <Textarea
            id="payment-note"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
          />
        </Field>

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
