import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { examInputSchema } from "@/features/exams/domain";
import { createExam, updateExam } from "@/features/exams/application/exam-cases";
import type { Exam, StudyGroup } from "@/lib/db/schema";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import { Modal } from "@/shared/Modal";
import { ExamFormFields, type ExamFormValues } from "./exam-form-fields";

interface ExamFormDialogProps {
  open: boolean;
  exam: Exam | null;
  groups: StudyGroup[];
  /** Group preselected when adding from a section header. */
  defaultGroupId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ExamFormDialog({ open, exam, groups, defaultGroupId, onClose, onSaved }: ExamFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ExamFormValues>({
    groupId: "",
    title: "",
    maxScore: "100",
    date: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        groupId: exam?.groupId ?? defaultGroupId ?? groups[0]?.id ?? "",
        title: exam?.title ?? "",
        maxScore: String(exam?.maxScore ?? 100),
        date: exam?.date ?? "",
      });
      setErrors({});
      setFatal("");
    }
  }, [open, exam, groups, defaultGroupId]);

  function setField<K extends keyof ExamFormValues>(key: K, value: ExamFormValues[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const mapErrors = (error: ZodError) =>
    mapZodErrors(error, (field, issue) =>
      field === "title"
        ? issue.code === "too_small"
          ? t("exams.errors.titleRequired")
          : t("exams.errors.titleTooLong")
        : field === "groupId"
          ? t("exams.errors.groupRequired")
          : field === "maxScore"
            ? t("exams.errors.maxScoreInvalid")
            : t("exams.errors.tooLong"),
    );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFatal("");
    try {
      examInputSchema.parse(form);
      if (exam) await updateExam(exam.id, form);
      else await createExam(form);
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
    <Modal open={open} onClose={onClose} title={exam ? t("exams.edit") : t("exams.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <ExamFormFields form={form} errors={errors} groups={groups} setField={setField} />

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("exams.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("exams.saving") : t("exams.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
