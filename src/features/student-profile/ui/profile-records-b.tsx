import { useCallback } from "react";
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

export function ExamsSection({
  rows,
  collapsed,
  onToggle,
}: {
  rows: ProfileExam[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const columns = useExamColumns();
  const getExamKey = useCallback((e: ProfileExam) => e.id, []);
  return (
    <ProfileSection
      title={t("profile.sections.exams")}
      meta={String(rows.length)}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      {rows.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.exams")} />
      ) : (
        <ProfileTable<ProfileExam> columns={columns} rows={rows} getRowKey={getExamKey} />
      )}
    </ProfileSection>
  );
}

export function SessionsSection({
  rows,
  collapsed,
  onToggle,
}: {
  rows: ProfileSessionAttendance[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const columns = useSessionColumns();
  const getSessionKey = useCallback((r: ProfileSessionAttendance) => r.id, []);
  return (
    <ProfileSection
      title={t("profile.sections.sessions")}
      meta={String(rows.length)}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      {rows.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.sessions")} />
      ) : (
        <ProfileTable<ProfileSessionAttendance> columns={columns} rows={rows} getRowKey={getSessionKey} />
      )}
    </ProfileSection>
  );
}

export function SkillsSection({
  skills,
  onManage,
  collapsed,
  onToggle,
}: {
  skills: StudentSkillRow[];
  onManage: () => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ProfileSection
      title={t("profile.sections.skills")}
      meta={String(skills.length)}
      actions={
        <Button size="sm" variant="outline" onClick={onManage}>
          <Sparkles className="size-4" />
          {t("profile.manageSkills")}
        </Button>
      }
      collapsed={collapsed}
      onToggle={onToggle}
    >
      {skills.length === 0 ? (
        <ProfileEmpty text={t("profile.empty.skills")} />
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <Badge
              key={s.skillId}
              variant={s.weak ? "destructive" : "secondary"}
              className="px-3 py-1"
            >
              {s.name}
              {s.level !== null ? ` · ${t(`skills.levels.${s.level}`)}` : ""}
            </Badge>
          ))}
        </div>
      )}
    </ProfileSection>
  );
}

export function ActivitySection({
  rows,
  collapsed,
  onToggle,
}: {
  rows: ActivityLogItem[];
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const columns = useProfileActivityColumns();
  const getActivityKey = useCallback((row: ActivityLogItem) => row.id, []);
  return (
    <ProfileSection
      title={t("profile.sections.activity")}
      meta={String(rows.length)}
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <ProfileTable<ActivityLogItem> columns={columns} rows={rows} getRowKey={getActivityKey} />
    </ProfileSection>
  );
}
