import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select } from "@/components/ui/select";
import type { Student, StudyGroup } from "@/lib/db/schema";

interface StudentDetailBodyProps {
  student: Student;
  planName: string | null;
  skillSummary: { tracked: number; weak: number } | null;
  groups: StudyGroup[];
  groupId: string;
  onClassChange: (groupId: string) => void;
  onOpenSkills: () => void;
}

export function StudentDetailBody({
  student,
  planName,
  skillSummary,
  groups,
  groupId,
  onClassChange,
  onOpenSkills,
}: StudentDetailBodyProps) {
  const { t } = useTranslation();
  const guardianRows = [
    { label: t("students.fields.phone"), value: student.phone },
    { label: t("students.fields.guardianName"), value: student.guardianName },
    { label: t("students.fields.guardianPhone"), value: student.guardianPhone },
  ].filter((r) => r.value);

  return (
    <>
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
          onChange={(e) => onClassChange(e.target.value)}
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
        <Button variant="outline" size="sm" onClick={onOpenSkills}>
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
    </>
  );
}
