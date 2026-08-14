import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudentSkillRow } from "@/features/skills/application/skill-cases";
import type {
  ProfileExam,
  ProfileSessionAttendance,
} from "@/features/student-profile/application/student-profile-cases";
import { ProfileEmpty, ProfileSection, ProfileTable } from "./profile-section";
import {
  useExamColumns,
  useProfileActivityColumns,
  useSessionColumns,
  type ActivityLogItem,
} from "./profile-columns-b";

export { WeakPointsSection } from "@/features/weak-points/ui/weak-points-section";

export function ExamsSection({ rows }: { rows: ProfileExam[] }) {
  const { t } = useTranslation();
  const columns = useExamColumns();
  return (
    <ProfileSection title={t("profile.sections.exams")}>
      {rows.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.exams")} />
      ) : (
        <ProfileTable<ProfileExam> columns={columns} rows={rows} getRowKey={(e) => e.id} />
      )}
    </ProfileSection>
  );
}

export function SessionsSection({ rows }: { rows: ProfileSessionAttendance[] }) {
  const { t } = useTranslation();
  const columns = useSessionColumns();
  return (
    <ProfileSection title={t("profile.sections.sessions")}>
      {rows.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.sessions")} />
      ) : (
        <ProfileTable<ProfileSessionAttendance>
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.id}
        />
      )}
    </ProfileSection>
  );
}

export function SkillsSection({
  skills,
  onManage,
}: {
  skills: StudentSkillRow[];
  onManage: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ProfileSection title={t("profile.sections.skills")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{t("profile.sections.skills")}</h3>
        <Button size="sm" variant="outline" onClick={onManage}>
          <Sparkles className="size-4" />
          {t("profile.manageSkills")}
        </Button>
      </div>
      {skills.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.skills")} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <Badge key={s.skillId} variant={s.weak ? "destructive" : "secondary"} className="px-3 py-1">
              {s.name}
              {s.level !== null ? ` · ${t(`skills.levels.${s.level}`)}` : ""}
            </Badge>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

export function ActivitySection({ rows }: { rows: ActivityLogItem[] }) {
  const { t } = useTranslation();
  const columns = useProfileActivityColumns();
  return (
    <ProfileSection title={t("profile.sections.activity")}>
      <ProfileTable<ActivityLogItem> columns={columns} rows={rows} getRowKey={(row) => row.id} />
    </ProfileSection>
  );
}
