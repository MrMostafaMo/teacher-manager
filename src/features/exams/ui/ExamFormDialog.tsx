import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { examInputSchema } from "@/features/exams/domain";
import { createExam, updateExam } from "@/features/exams/application/exam-cases";
import type { Exam, StudyGroup } from "@/lib/db/schema";
import { Modal } from "@/features/students/ui/Modal";

interface ExamFormDialogProps {
  open: boolean;
  exam: Exam | null;
  groups: StudyGroup[];
  /** Group preselected when adding from a section header. */
  defaultGroupId?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  groupId: string;
  title: string;
  maxScore: string;
  date: string;
}

export function ExamFormDialog({ open, exam, groups, defaultGroupId, onClose, onSaved }: ExamFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>({
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

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function mapErrors(error: ZodError): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "");
      if (mapped[field]) continue;
      mapped[field] =
        field === "title"
          ? issue.code === "too_small"
            ? t("exams.errors.titleRequired")
            : t("exams.errors.titleTooLong")
          : field === "groupId"
            ? t("exams.errors.groupRequired")
            : field === "maxScore"
              ? t("exams.errors.maxScoreInvalid")
              : t("exams.errors.tooLong");
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
        <div className="space-y-1.5">
          <Label htmlFor="exam-group">
            {t("exams.fields.group")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="exam-group"
            value={form.groupId}
            onChange={(e) => setField("groupId", e.target.value)}
            aria-invalid={!!errors.groupId}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {errors.groupId && <p className="text-xs text-destructive">{errors.groupId}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exam-title">
            {t("exams.fields.title")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="exam-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="exam-date">{t("exams.fields.date")}</Label>
            <Input
              id="exam-date"
              type="date"
              value={form.date}
              onChange={(e) => setField("date", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-max">{t("exams.fields.maxScore")}</Label>
            <Input
              id="exam-max"
              type="number"
              min={1}
              value={form.maxScore}
              onChange={(e) => setField("maxScore", e.target.value)}
              aria-invalid={!!errors.maxScore}
            />
            {errors.maxScore && <p className="text-xs text-destructive">{errors.maxScore}</p>}
          </div>
        </div>

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
