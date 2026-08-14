import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteStudent } from "@/features/students/application/student-cases";
import { setStudentGroup } from "@/features/groups/application/group-cases";
import { StudentSkillsDialog } from "@/features/skills/ui/StudentSkillsDialog";
import type { Student } from "@/lib/db/schema";
import { formatDateString } from "@/lib/utils/format";
import { ConfirmDeleteButton } from "@/shared/ConfirmDeleteButton";
import { Modal } from "@/shared/Modal";
import { notifyUndo } from "@/lib/undo-store";
import { StatusBadge } from "./StatusBadge";
import { useStudentDetail } from "./use-student-detail";
import { StudentDetailBody } from "./student-detail-body";

interface StudentDetailDialogProps {
  student: Student;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function StudentDetailDialog({ student, onClose, onEdit, onDeleted }: StudentDetailDialogProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [skillsOpen, setSkillsOpen] = useState(false);
  const { planName, skillSummary, setSkillSummary, groups, groupId, setGroupId } =
    useStudentDetail(student, skillsOpen);

  useEffect(() => {
    setConfirming(false);
    setError("");
  }, [student.id]);

  async function handleClassChange(next: string) {
    setGroupId(next);
    try {
      await setStudentGroup(student.id, next || null);
      setError("");
    } catch {
      setError(t("students.classError"));
    }
  }

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      const undoId = await deleteStudent(student.id);
      onDeleted();
      onClose();
      if (undoId !== null) {
        notifyUndo(undoId, t("undo.deleted"), `${t("undo.student")}: ${student.name}`, t("undo.undo"));
      }
    } catch {
      setError(t("students.deleteError"));
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={student.name}
      description={`${t("students.registered")} ${formatDateString(student.enrolledOn)}`}
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <StatusBadge status={student.status} />
        </div>

        <StudentDetailBody
          student={student}
          planName={planName}
          skillSummary={skillSummary}
          groups={groups}
          groupId={groupId}
          onClassChange={(v) => void handleClassChange(v)}
          onOpenSkills={() => setSkillsOpen(true)}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <ConfirmDeleteButton
            armed={confirming}
            deleteLabel={t("students.delete")}
            confirmLabel={t("students.confirmDelete")}
            onDelete={() => void handleDelete()}
          />
          <Button onClick={onEdit}>
            <Pencil />
            {t("students.edit")}
          </Button>
        </div>
      </div>

      <StudentSkillsDialog
        open={skillsOpen}
        studentId={student.id}
        studentName={student.name}
        onClose={() => setSkillsOpen(false)}
        onChanged={() => setSkillSummary(null)}
      />
    </Modal>
  );
}
