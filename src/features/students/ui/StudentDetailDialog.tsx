import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select } from "@/components/ui/select";
import { deleteStudent } from "@/features/students/application/student-cases";
import { listPlans } from "@/features/payments/application/plan-cases";
import { listGroups, listMemberships, setStudentGroup } from "@/features/groups/application/group-cases";
import type { GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import { getStudentSkills } from "@/features/skills/application/skill-cases";
import { StudentSkillsDialog } from "@/features/skills/ui/StudentSkillsDialog";
import type { Student } from "@/lib/db/schema";
import { formatDateString } from "@/lib/utils/format";
import { Modal } from "@/shared/Modal";
import { StatusBadge } from "./StatusBadge";

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
  const [planName, setPlanName] = useState<string | null>(null);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [skillSummary, setSkillSummary] = useState<{ tracked: number; weak: number } | null>(null);
  const [groups, setGroups] = useState<GroupWithCount[]>([]);
  const [groupId, setGroupId] = useState("");

  useEffect(() => {
    setConfirming(false);
    setError("");
  }, [student.id]);

  useEffect(() => {
    let cancelled = false;
    void listGroups()
      .then((all) => {
        if (cancelled) return;
        setGroups(all);
      })
      .catch(() => {
        if (cancelled) return;
        setGroups([]);
      });
    void listMemberships()
      .then((m) => {
        if (cancelled) return;
        const member = m.find((x) => x.studentId === student.id);
        setGroupId(member?.groupId ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setGroupId("");
      });
    return () => {
      cancelled = true;
    };
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

  useEffect(() => {
    let cancelled = false;
    getStudentSkills(student.id)
      .then((rows) => {
        if (cancelled) return;
        setSkillSummary({
          tracked: rows.filter((r) => r.level !== null).length,
          weak: rows.filter((r) => r.weak).length,
        });
      })
      .catch(() => {
        if (!cancelled) setSkillSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [student.id, skillsOpen]);

  useEffect(() => {
    if (!student.planId) {
      setPlanName(null);
      return;
    }
    void listPlans()
      .then((plans) => {
        const plan = plans.find((p) => p.id === student.planId);
        setPlanName(plan ? plan.name : null);
      })
      .catch(() => setPlanName(null));
  }, [student.planId]);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    try {
      await deleteStudent(student.id);
      onDeleted();
      onClose();
    } catch {
      setError(t("students.deleteError"));
    }
  }

  const guardianRows = [
    { label: t("students.fields.phone"), value: student.phone },
    { label: t("students.fields.guardianName"), value: student.guardianName },
    { label: t("students.fields.guardianPhone"), value: student.guardianPhone },
  ].filter((r) => r.value);

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

        {guardianRows.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("students.guardian")}</p>
              {guardianRows.map((r) => (
                <p key={r.label} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span dir="ltr" className="text-end">
                    {r.value}
                  </span>
                </p>
              ))}
            </div>
          </>
        )}

        <Separator />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("students.fields.plan")}</p>
          <p className="text-sm">{planName ?? t("students.noPlan")}</p>
        </div>

        <Separator />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("students.fields.class")}</p>
          <Select
            value={groupId}
            onChange={(e) => void handleClassChange(e.target.value)}
            aria-label={t("students.fields.class")}
          >
            <option value="">{t("students.noClass")}</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>

        <Separator />
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">{t("students.skills")}</p>
            <p className="text-sm">
              {skillSummary === null
                ? "—"
                : t("skills.summary", { tracked: skillSummary.tracked, weak: skillSummary.weak })}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSkillsOpen(true)}>
            <Sparkles />
            {t("students.manageSkills")}
          </Button>
        </div>

        {student.notes && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("students.fields.notes")}</p>
              <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
            </div>
          </>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant={confirming ? "destructive" : "ghost"} onClick={handleDelete}>
            <Trash2 />
            {confirming ? t("students.confirmDelete") : t("students.delete")}
          </Button>
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
