import { useEffect, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/shared/DatePicker";
import { Field } from "@/shared/Field";
import { weakPointInputSchema, type WeakPointInput } from "@/features/weak-points/domain";
import { mapZodErrors } from "@/lib/utils/zod-errors";

export interface WeakPointFormState {
  description: string;
  date: string;
}

export function emptyWeakPointForm(): WeakPointFormState {
  return { description: "", date: dayjs().format("YYYY-MM-DD") };
}

export function weakPointFormFromRow(row: {
  description: string;
  recordedOn: number;
}): WeakPointFormState {
  return { description: row.description, date: dayjs(row.recordedOn).format("YYYY-MM-DD") };
}

export function weakPointInputFromForm(form: WeakPointFormState): WeakPointInput {
  return {
    description: form.description,
    recordedOn: dayjs(form.date).valueOf(),
    resolved: false,
  };
}

/** Add/edit form for one weak point. `onSave` errors surface as field/fatal. */
export function WeakPointForm({
  initial,
  onSave,
  saving,
  onClose,
}: {
  initial: WeakPointFormState;
  onSave: (input: WeakPointInput) => Promise<void>;
  saving: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<WeakPointFormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");

  useEffect(() => {
    setForm(initial);
    setErrors({});
    setFatal("");
  }, [initial]);

  function setField<K extends keyof WeakPointFormState>(key: K, value: WeakPointFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setErrors({});
    setFatal("");
    try {
      const input = weakPointInputFromForm(form);
      weakPointInputSchema.parse(input);
      await onSave(input);
    } catch (error) {
      if (error instanceof ZodError) {
        setErrors(
          mapZodErrors(error, (field) =>
            field === "description"
              ? t("weakPoints.errors.descriptionRequired")
              : t("weakPoints.saveError"),
          ),
        );
      } else {
        setFatal(getErrorMessage(error));
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        id="weak-point-description"
        label={t("weakPoints.description")}
        required
        error={errors.description}
      >
        <Input
          id="weak-point-description"
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder={t("weakPoints.descriptionPlaceholder")}
          aria-invalid={!!errors.description}
        />
      </Field>

      <Field id="weak-point-date" label={t("weakPoints.recordedOn")}>
        <DatePicker
          value={form.date}
          onChange={(v) => setField("date", v)}
          ariaLabel={t("weakPoints.recordedOn")}
          className="w-full"
        />
      </Field>

      {fatal && <p className="text-sm text-destructive">{fatal}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
          {t("weakPoints.cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("weakPoints.saving") : t("weakPoints.save")}
        </Button>
      </div>
    </form>
  );
}
