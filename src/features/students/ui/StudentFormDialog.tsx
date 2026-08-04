import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studentInputSchema } from "@/features/students/domain";
import { createStudent, updateStudent } from "@/features/students/application/student-cases";
import { listPlans } from "@/features/payments/application/plan-cases";
import type { Plan, Student } from "@/lib/db/schema";
import { Modal } from "./Modal";

interface StudentFormDialogProps {
  open: boolean;
  student: Student | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  status: "active" | "inactive";
  planId: string;
  notes: string;
}

const emptyForm: FormState = {
  name: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  status: "active",
  planId: "",
  notes: "",
};

export function StudentFormDialog({ open, student, onClose, onSaved }: StudentFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    if (open) {
      setForm({
        name: student?.name ?? "",
        phone: student?.phone ?? "",
        guardianName: student?.guardianName ?? "",
        guardianPhone: student?.guardianPhone ?? "",
        status: student?.status ?? "active",
        planId: student?.planId ?? "",
        notes: student?.notes ?? "",
      });
      setErrors({});
      setFatal("");
      void listPlans()
        .then(setPlans)
        .catch(() => setPlans([]));
    }
  }, [open, student]);

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
            ? t("students.errors.nameRequired")
            : t("students.errors.nameTooLong");
      } else {
        mapped[field] = t("students.errors.tooLong");
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
      studentInputSchema.parse(form);
      if (student) await updateStudent(student.id, form);
      else await createStudent(form);
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
    <Modal open={open} onClose={onClose} title={student ? t("students.edit") : t("students.add")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="student-name">
            {t("students.fields.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="student-name"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="student-phone">{t("students.fields.phone")}</Label>
            <Input
              id="student-phone"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              aria-invalid={!!errors.phone}
            />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="student-status">{t("students.fields.status")}</Label>
            <select
              id="student-status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value as FormState["status"])}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="active">{t("students.statusActive")}</option>
              <option value="inactive">{t("students.statusInactive")}</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="student-guardian-name">{t("students.fields.guardianName")}</Label>
            <Input
              id="student-guardian-name"
              value={form.guardianName}
              onChange={(e) => setField("guardianName", e.target.value)}
              aria-invalid={!!errors.guardianName}
            />
            {errors.guardianName && <p className="text-xs text-destructive">{errors.guardianName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="student-guardian-phone">{t("students.fields.guardianPhone")}</Label>
            <Input
              id="student-guardian-phone"
              dir="ltr"
              value={form.guardianPhone}
              onChange={(e) => setField("guardianPhone", e.target.value)}
              aria-invalid={!!errors.guardianPhone}
            />
            {errors.guardianPhone && (
              <p className="text-xs text-destructive">{errors.guardianPhone}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="student-plan">{t("students.fields.plan")}</Label>
            <select
              id="student-plan"
              value={form.planId}
              onChange={(e) => setField("planId", e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
            >
              <option value="">{t("students.noPlan")}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.amount}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden sm:block" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="student-notes">{t("students.fields.notes")}</Label>
          <textarea
            id="student-notes"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder={t("students.notesPlaceholder")}
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring placeholder:text-muted-foreground"
          />
          {errors.notes && <p className="text-xs text-destructive">{errors.notes}</p>}
        </div>

        {fatal && <p className="text-sm text-destructive">{fatal}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            {t("students.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("students.saving") : t("students.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
