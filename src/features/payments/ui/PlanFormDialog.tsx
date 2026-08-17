import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { planInputSchema } from "@/features/payments/domain";
import { createPlan, updatePlan } from "@/features/payments/application/plan-cases";
import type { Plan } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { Modal } from "@/shared/Modal";
import { Field } from "@/shared/Field";

interface PlanFormDialogProps {
  open: boolean;
  plan: Plan | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  amount: string;
  billingInterval: "monthly" | "term" | "yearly";
}

const emptyForm: FormState = { name: "", amount: "", billingInterval: "monthly" };

export function PlanFormDialog({ open, plan, onClose, onSaved }: PlanFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: plan?.name ?? "",
        amount: plan ? String(plan.amount) : "",
        billingInterval: plan?.billingInterval ?? "monthly",
      });
      setErrors({});
      setFatal("");
    }
  }, [open, plan]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (field, issue) =>
      field === "name"
        ? issue.code === "too_small"
          ? t("plans.errors.nameRequired")
          : t("plans.errors.nameTooLong")
        : t("plans.errors.amountInvalid"),
    );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFatal("");
    try {
      const input = {
        name: form.name,
        amount: Number(form.amount),
        billingInterval: form.billingInterval,
      };
      planInputSchema.parse(input);
      if (plan) await updatePlan(plan.id, input);
      else await createPlan(input);
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
    <Modal open={open} onClose={onClose} title={plan ? t("plans.edit") : t("plans.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field id="plan-name" label={t("plans.name")} required error={errors.name}>
          <Input
            id="plan-name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="plan-amount" label={t("plans.amount")} required error={errors.amount}>
            <Input
              id="plan-amount"
              dir="ltr"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              aria-invalid={!!errors.amount}
            />
          </Field>
          <Field id="plan-interval" label={t("plans.interval")}>
            <Select
              id="plan-interval"
              value={form.billingInterval}
              onChange={(e) =>
                setField("billingInterval", e.target.value as FormState["billingInterval"])
              }
            >
              <option value="monthly">{t("plans.monthly")}</option>
              <option value="term">{t("plans.term")}</option>
              <option value="yearly">{t("plans.yearly")}</option>
            </Select>
          </Field>
        </div>

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("plans.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("plans.saving") : t("plans.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
