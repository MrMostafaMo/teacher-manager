import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { planInputSchema } from "@/features/payments/domain";
import { createPlan, updatePlan } from "@/features/payments/application/plan-cases";
import type { Plan } from "@/lib/db/schema";
import { Modal } from "@/features/students/ui/Modal";

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

  function mapErrors(error: ZodError): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "");
      if (mapped[field]) continue;
      if (field === "name") {
        mapped[field] =
          issue.code === "too_small"
            ? t("plans.errors.nameRequired")
            : t("plans.errors.nameTooLong");
      } else if (field === "amount") {
        mapped[field] = t("plans.errors.amountInvalid");
      } else {
        mapped[field] = t("plans.errors.amountInvalid");
      }
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
      const input = { name: form.name, amount: Number(form.amount), billingInterval: form.billingInterval };
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
        <div className="space-y-1.5">
          <Label htmlFor="plan-name">
            {t("plans.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="plan-name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="plan-amount">
              {t("plans.amount")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="plan-amount"
              dir="ltr"
              type="number"
              min={1}
              value={form.amount}
              onChange={(e) => setField("amount", e.target.value)}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-interval">{t("plans.interval")}</Label>
            <select
              id="plan-interval"
              value={form.billingInterval}
              onChange={(e) => setField("billingInterval", e.target.value as FormState["billingInterval"])}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
            >
              <option value="monthly">{t("plans.monthly")}</option>
              <option value="term">{t("plans.term")}</option>
              <option value="yearly">{t("plans.yearly")}</option>
            </select>
          </div>
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
