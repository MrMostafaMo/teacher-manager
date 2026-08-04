import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { homeworkInputSchema } from "@/features/homework/domain";
import { createHomework, updateHomework } from "@/features/homework/application/homework-cases";
import type { Homework, StudyGroup } from "@/lib/db/schema";
import { Modal } from "@/features/students/ui/Modal";

interface HomeworkFormDialogProps {
  open: boolean;
  homework: Homework | null;
  groups: StudyGroup[];
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  groupId: string;
  title: string;
  description: string;
  dueDate: string;
}

export function HomeworkFormDialog({
  open,
  homework,
  groups,
  onClose,
  onSaved,
}: HomeworkFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>({
    groupId: "",
    title: "",
    description: "",
    dueDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        groupId: homework?.groupId ?? groups[0]?.id ?? "",
        title: homework?.title ?? "",
        description: homework?.description ?? "",
        dueDate: homework?.dueDate ?? "",
      });
      setErrors({});
      setFatal("");
    }
  }, [open, homework, groups]);

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
            ? t("homework.errors.titleRequired")
            : t("homework.errors.titleTooLong")
          : field === "groupId"
            ? t("homework.errors.groupRequired")
            : t("homework.errors.tooLong");
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
      homeworkInputSchema.parse(form);
      if (homework) await updateHomework(homework.id, form);
      else await createHomework(form);
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
    <Modal open={open} onClose={onClose} title={homework ? t("homework.edit") : t("homework.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="homework-group">
            {t("homework.fields.group")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="homework-group"
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
          <Label htmlFor="homework-title">
            {t("homework.fields.title")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="homework-title"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            aria-invalid={!!errors.title}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="homework-due">{t("homework.fields.dueDate")}</Label>
            <Input
              id="homework-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => setField("dueDate", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="homework-description">{t("homework.fields.description")}</Label>
          <textarea
            id="homework-description"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder={t("homework.descriptionPlaceholder")}
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring placeholder:text-muted-foreground"
          />
          {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
        </div>

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
