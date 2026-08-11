import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { paymentInputSchema } from "@/features/payments/domain";
import { listPlans } from "@/features/payments/application/plan-cases";
import { recordPayment, updatePayment } from "@/features/payments/application/payment-cases";
import { listStudents } from "@/features/students/application/student-cases";
import type { Payment, Plan, Student } from "@/lib/db/schema";
import { Modal } from "@/shared/Modal";
import {
  emptyPaymentForm,
  paymentFormErrors,
  paymentFormFromPayment,
  type PaymentFormState,
} from "./payment-form";
import { PaymentFormFields } from "./payment-form-fields";

interface RecordPaymentDialogProps {
  open: boolean;
  defaultPeriod: string;
  payment?: Payment | null;
  onClose: () => void;
  onSaved: () => void;
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
  const [form, setForm] = useState<PaymentFormState>(emptyPaymentForm(defaultPeriod));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(payment ? paymentFormFromPayment(payment) : emptyPaymentForm(defaultPeriod));
    setErrors({});
    setFatal("");
    void listStudents({ status: "active" })
      .then(setStudents)
      .catch(() => setStudents([]));
    void listPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [open, defaultPeriod, payment]);

  function setField<K extends keyof PaymentFormState>(key: K, value: PaymentFormState[K]) {
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
      if (error instanceof ZodError) setErrors(paymentFormErrors(t, error));
      else setFatal(String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={payment ? t("payments.edit") : t("payments.record")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentFormFields
          form={form}
          errors={errors}
          students={students}
          plans={plans}
          onStudentChange={handleStudentChange}
          onPlanChange={handlePlanChange}
          setField={setField}
        />

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
