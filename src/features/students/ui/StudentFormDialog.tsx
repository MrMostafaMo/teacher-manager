import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { ZodError } from "zod";
import { Button } from "@/components/ui/button";
import { studentInputSchema } from "@/features/students/domain";
import { createStudent, updateStudent } from "@/features/students/application/student-cases";
import { listPlans } from "@/features/payments/application/plan-cases";
import {
  listGroups,
  listMemberships,
  setStudentGroup,
} from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import type { Plan, Student } from "@/lib/db/schema";
import { Modal } from "@/shared/Modal";
import {
  emptyStudentForm,
  initialStudentForm,
  studentFormErrors,
  type StudentFormState,
} from "./student-form";
import { StudentFormFields } from "./StudentFormFields";

interface StudentFormDialogProps {
  open: boolean;
  student: Student | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StudentFormDialog({ open, student, onClose, onSaved }: StudentFormDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<StudentFormState>(emptyStudentForm);
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
      setForm(initialStudentForm(student));
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

  function setField<K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
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
      if (error instanceof ZodError) setErrors(studentFormErrors(t, error));
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
        <StudentFormFields
          form={form}
          errors={errors}
          plans={plans}
          groups={groups}
          onChange={setField}
        />

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
