import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import dayjs from "dayjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { studentInputSchema } from "@/features/students/domain";
import { createStudent, updateStudent } from "@/features/students/application/student-cases";
import { listPlans } from "@/features/payments/application/plan-cases";
import { listGroups, listMemberships, setStudentGroup } from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { Plan, Student } from "@/lib/db/schema";
import { DatePicker } from "@/shared/DatePicker";
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
  groupId: string;
  notes: string;
  enrolledOn: string;
}

const emptyForm: FormState = {
  name: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  status: "active",
  planId: "",
  groupId: "",
  notes: "",
  enrolledOn: "",
};

export function StudentFormDialog({ open, student, onClose, onSaved }: StudentFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fatal, setFatal] = useState("");
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  // Current membership (so an unchanged selection doesn't wipe memberships)
  // + readiness guard so a submit can't race the async membership load.
  const [loadedGroupId, setLoadedGroupId] = useState<string | null>(null);
  const [membershipReady, setMembershipReady] = useState(false);
  // Set once the student row exists — a later membership failure must not
  // let a resubmit create a duplicate student.
  const studentCreated = useRef(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: student?.name ?? "",
        phone: student?.phone ?? "",
        guardianName: student?.guardianName ?? "",
        guardianPhone: student?.guardianPhone ?? "",
        status: student?.status ?? "active",
        planId: student?.planId ?? "",
        groupId: "",
        notes: student?.notes ?? "",
        enrolledOn: student ? (student.enrolledOn ?? "") : dayjs().format("YYYY-MM-DD"),
      });
      setErrors({});
      setFatal("");
      setSaving(false);
      setLoadedGroupId(null);
      setMembershipReady(!student);
      studentCreated.current = false;
      void listPlans()
        .then(setPlans)
        .catch(() => setPlans([]));
      void listGroups()
        .then(setGroups)
        .catch(() => setGroups([]));
      if (student) {
        void listMemberships()
          .then((m) => {
            const member = m.find((x) => x.studentId === student.id);
            const groupId = member?.groupId ?? "";
            setLoadedGroupId(groupId || null);
            setForm((f) => ({ ...f, groupId }));
          })
          .catch(() => undefined)
          .finally(() => setMembershipReady(true));
      }
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
    if (saving || (student && !membershipReady)) return;
    setSaving(true);
    setErrors({});
    setFatal("");
    try {
      studentInputSchema.parse(form);
      if (student) {
        await updateStudent(student.id, form);
        const wantsGroup = form.groupId || null;
        if (loadedGroupId !== wantsGroup) {
          await setStudentGroup(student.id, wantsGroup);
        }
      } else {
        const row = await createStudent(form);
        studentCreated.current = true;
        if (form.groupId) await setStudentGroup(row.id, form.groupId);
      }
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ZodError) setErrors(mapErrors(error));
      else {
        setFatal(String(error));
        // The student already exists — closing prevents a retry duplicating them.
        if (studentCreated.current) {
          onSaved();
          onClose();
        }
      }
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

        <div className="space-y-1.5">
          <Label htmlFor="student-enrolled-on">{t("students.fields.enrolledOn")}</Label>
          <DatePicker
            value={form.enrolledOn}
            onChange={(v) => setField("enrolledOn", v)}
            ariaLabel={t("students.fields.enrolledOn")}
            className="w-full"
          />
          {errors.enrolledOn && <p className="text-xs text-destructive">{errors.enrolledOn}</p>}
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
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
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
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
            >
              <option value="">{t("students.noPlan")}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.amount}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="student-class">{t("students.fields.class")}</Label>
            <select
              id="student-class"
              value={form.groupId}
              onChange={(e) => setField("groupId", e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring dark:bg-muted/50"
            >
              <option value="">{t("students.noClass")}</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="student-notes">{t("students.fields.notes")}</Label>
          <textarea
            id="student-notes"
            value={form.notes}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder={t("students.notesPlaceholder")}
            className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring placeholder:text-muted-foreground dark:bg-muted/50"
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
