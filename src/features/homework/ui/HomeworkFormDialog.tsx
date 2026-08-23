import { useEffect, useState, type FormEvent } from "react";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { homeworkInputSchema } from "@/features/homework/domain";
import { createHomework, updateHomework } from "@/features/homework/application/homework-cases";
import type { Homework, StudyGroup } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { Modal } from "@/shared/Modal";
import { DatePicker } from "@/shared/DatePicker";
import { Field } from "@/shared/Field";
import {
  emptyHomeworkForm,
  initialHomeworkForm,
  type HomeworkFormState,
} from "./homework-form-utils";

interface HomeworkFormDialogProps {
  open: boolean;
  homework: Homework | null;
  groups: StudyGroup[];
  /** Group preselected when adding from a section header. */
  defaultGroupId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function HomeworkFormDialog({
  open,
  homework,
  groups,
  defaultGroupId,
  onClose,
  onSaved,
}: HomeworkFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<HomeworkFormState>(emptyHomeworkForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initialHomeworkForm(homework, groups, defaultGroupId));
      setErrors({});
      setFatal("");
    }
  }, [open, homework, groups, defaultGroupId]);

  function setField<K extends keyof HomeworkFormState>(key: K, value: HomeworkFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (field, issue) =>
      field === "title"
        ? issue.code === "too_small"
          ? t("homework.errors.titleRequired")
          : t("homework.errors.titleTooLong")
        : field === "groupId"
          ? t("homework.errors.groupRequired")
          : t("homework.errors.tooLong"),
    );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFatal("");
    try {
      homeworkInputSchema.parse(form);
      if (homework) await updateHomework(homework.id, form);
      else await createHomework(form);
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ZodError) setErrors(mapErrors(error));
      else setFatal(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={homework ? t("homework.edit") : t("homework.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          id="homework-group"
          label={t("homework.fields.group")}
          required
          error={errors.groupId}
        >
          <Select
            id="homework-group"
            value={form.groupId}
            onChange={(e) => setField("groupId", e.target.value)}
            aria-invalid={!!errors.groupId}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field id="homework-title" label={t("homework.fields.title")} required error={errors.title}>
          <Input
            id="homework-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            aria-invalid={!!errors.title}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="homework-due" label={t("homework.fields.dueDate")}>
            <DatePicker
              value={form.dueDate}
              onChange={(v) => setField("dueDate", v)}
              ariaLabel={t("homework.fields.dueDate")}
              className="w-full"
            />
          </Field>
        </div>

        <Field
          id="homework-description"
          label={t("homework.fields.description")}
          error={errors.description}
        >
          <Textarea
            id="homework-description"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder={t("homework.descriptionPlaceholder")}
          />
        </Field>

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("homework.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("homework.saving") : t("homework.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
