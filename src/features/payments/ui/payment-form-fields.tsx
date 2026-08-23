import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MonthPicker } from "@/shared/DatePicker";
import { Field } from "@/shared/Field";
import { formatMoney } from "@/lib/utils/format";
import type { Plan, Student } from "@/lib/db/schema";
import type { PaymentFormState } from "./payment-form";

export function PaymentFormFields({
  form,
  errors,
  students,
  plans,
  onStudentChange,
  onPlanChange,
  setField,
}: {
  form: PaymentFormState;
  errors: Record<string, string>;
  students: Student[];
  plans: Plan[];
  onStudentChange: (studentId: string) => void;
  onPlanChange: (planId: string) => void;
  setField: <K extends keyof PaymentFormState>(key: K, value: PaymentFormState[K]) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <Field id="payment-student" label={t("payments.student")} required error={errors.studentId}>
        <Select
          id="payment-student"
          value={form.studentId}
          onChange={(e) => onStudentChange(e.target.value)}
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
            onChange={(e) => onPlanChange(e.target.value)}
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
        <Field id="payment-period" label={t("payments.period")} required error={errors.period}>
          <MonthPicker
            value={form.period}
            onChange={(v) => setField("period", v)}
            ariaLabel={t("payments.period")}
            className="w-full"
          />
        </Field>
        <Field id="payment-method" label={t("payments.method")}>
          <Select
            id="payment-method"
            value={form.method}
            onChange={(e) => setField("method", e.target.value as PaymentFormState["method"])}
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
    </>
  );
}
