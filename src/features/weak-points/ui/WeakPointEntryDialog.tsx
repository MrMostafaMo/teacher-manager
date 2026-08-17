import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/Modal";
import { Field } from "@/shared/Field";
import { Select } from "@/components/ui/select";
import { toast } from "@/lib/toast-store";
import type { WeakPointInput } from "@/features/weak-points/domain";
import {
  addWeakPoint,
  updateWeakPoint,
  type StudentWeakPoint,
} from "@/features/weak-points/application/weak-point-cases";
import {
  emptyWeakPointForm,
  weakPointFormFromRow,
  WeakPointForm,
  type WeakPointFormState,
} from "./weak-point-form";

interface WeakPointEntryDialogProps {
  open: boolean;
  students: { id: string; name: string }[];
  /** Row being edited; null opens the record mode with a student picker. */
  editing: StudentWeakPoint | null;
  onClose: () => void;
  onChanged: () => void;
}

export function WeakPointEntryDialog({
  open,
  students,
  editing,
  onClose,
  onChanged,
}: WeakPointEntryDialogProps) {
  const { t } = useTranslation();
  const [studentId, setStudentId] = useState("");
  const [formState, setFormState] = useState<WeakPointFormState>(emptyWeakPointForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormState(editing ? weakPointFormFromRow(editing) : emptyWeakPointForm());
    setStudentId(editing ? editing.studentId : (students[0]?.id ?? ""));
  }, [open, editing, students]);

  async function handleSave(input: WeakPointInput) {
    setSaving(true);
    try {
      if (editing) {
        await updateWeakPoint(editing.id, { ...input, resolved: editing.resolved });
      } else {
        if (!studentId) return;
        await addWeakPoint(studentId, input);
      }
      toast(t("weakPoints.saved"));
      onChanged();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t("weakPoints.edit") : t("weakPoints.record")}
      className="max-w-md"
    >
      {!editing && (
        <Field id="weak-point-student" label={t("weakPoints.student")} required>
          <Select
            id="weak-point-student"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            aria-label={t("weakPoints.student")}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <WeakPointForm initial={formState} onSave={handleSave} saving={saving} onClose={onClose} />
    </Modal>
  );
}
