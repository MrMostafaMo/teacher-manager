import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studyGroupInputSchema } from "@/features/groups/domain";
import { createGroup, updateGroup } from "@/features/groups/application/group-cases";
import type { StudyGroup } from "@/lib/db/schema";
import { Modal } from "@/features/students/ui/Modal";

interface GroupFormDialogProps {
  open: boolean;
  group: StudyGroup | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  subject: string;
  schedule: string;
  status: "active" | "inactive";
  notes: string;
}

const emptyForm: FormState = { name: "", subject: "", schedule: "", status: "active", notes: "" };

export function GroupFormDialog({ open, group, onClose, onSaved }: GroupFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: group?.name ?? "",
        subject: group?.subject ?? "",
        schedule: group?.schedule ?? "",
        status: group?.status ?? "active",
        notes: group?.notes ?? "",
      });
      setErrors({});
      setFatal("");
    }
  }, [open, group]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function mapErrors(error: ZodError): Record<string, string> {
    const mapped: Record<string, string> = {};
    for (const issue of error.issues) {
      const field = String(issue.path[0] ?? "");
      if (mapped[field]) continue;
      mapped[field] =
        field === "name"
          ? issue.code === "too_small"
            ? t("groups.errors.nameRequired")
            : t("groups.errors.nameTooLong")
          : t("groups.errors.tooLong");
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
      studyGroupInputSchema.parse(form);
      if (group) await updateGroup(group.id, form);
      else await createGroup(form);
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
    <Modal open={open} onClose={onClose} title={group ? t("groups.edit") : t("groups.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="group-name">
            {t("groups.fields.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="group-name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="group-subject">{t("groups.fields.subject")}</Label>
            <Input
              id="group-subject"
              value={form.subject}
              onChange={(e) => setField("subject", e.target.value)}
              aria-invalid={!!errors.subject}
            />
            {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="group-status">{t("groups.fields.status")}</Label>
            <select
              id="group-status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value as FormState["status"])}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="active">{t("groups.statusActive")}</option>
              <option value="inactive">{t("groups.statusInactive")}</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group-schedule">{t("groups.fields.schedule")}</Label>
          <Input
            id="group-schedule"
            value={form.schedule}
            onChange={(e) => setField("schedule", e.target.value)}
            placeholder={t("groups.schedulePlaceholder")}
            aria-invalid={!!errors.schedule}
          />
          {errors.schedule && <p className="text-xs text-destructive">{errors.schedule}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="group-notes">{t("groups.fields.notes")}</Label>
          <textarea
            id="group-notes"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder={t("groups.notesPlaceholder")}
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring placeholder:text-muted-foreground"
          />
          {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
        </div>

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("groups.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("groups.saving") : t("groups.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
