import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  getStudentProfile,
  type StudentProfileData,
} from "@/features/student-profile/application/student-profile-cases";
import { StudentFormDialog } from "@/features/students/ui/StudentFormDialog";
import { StudentSkillsDialog } from "@/features/skills/ui/StudentSkillsDialog";
import { WeakPointsDialog } from "@/features/weak-points/ui/WeakPointsDialog";
import { SendWhatsAppDialog } from "@/features/whatsapp/ui/SendWhatsAppDialog";
import { StudentStatementDialog } from "@/features/student-profile/ui/StudentStatementDialog";
import { StudentTrendsSection } from "@/features/student-profile/ui/StudentTrendsSection";
import { useReportCard } from "@/features/report-card/ui/use-report-card";
import { useIdCard } from "./use-id-card";
import { useCollapsedSections } from "@/shared/useCollapsedSections";
import { useDataChanged } from "@/shared/useDataChanged";
import { ProfileFactsCard, ProfileStatsGrid } from "./profile-overview";
import { computeProfileSummary } from "../application/profile-summary";
import { ProfileHeader } from "./profile-header";
import { ProfilePageSkeleton } from "./profile-skeleton";
import { ProfileSections, profileSectionDefaults } from "./profile-sections";
import { toast } from "@/lib/toast-store";

export default function StudentProfilePage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [weakPointsOpen, setWeakPointsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!data) setLoading(true);
    getStudentProfile(id)
      .then(setData)
      .catch((e) => {
        console.error("Failed to load student profile", e);
        toast(t("profile.loadError"), "error");
      })
      .finally(() => setLoading(false));
  }, [id, reloadKey, t]);

  useDataChanged(() => setReloadKey((k) => k + 1));

  const { busy: reportCardBusy, run: runReportCard } = useReportCard(data);
  const { handleExportIdCard } = useIdCard();

  const { isCollapsed, toggle } = useCollapsedSections(
    data ? profileSectionDefaults(data) : undefined,
  );

  if (loading && !data) {
    return <ProfilePageSkeleton />;
  }
  if (!data) {
    return <p className="py-16 text-center text-destructive">{t("profile.notFound")}</p>;
  }

  const { student, planName, groups, sessionAttendance } = data;
  const { attendanceRate, homeworkRate, examAverage } = computeProfileSummary(data);

  return (
    <div className="space-y-6">
      <ProfileHeader
        student={student}
        balance={data.balance}
        onEdit={() => setEditOpen(true)}
        onStatement={() => setStatementOpen(true)}
        onReportCard={runReportCard}
        reportCardBusy={reportCardBusy}
        onWhatsApp={() => setWhatsAppOpen(true)}
        onIdCard={() => void handleExportIdCard(data)}
      />

      <ProfileFactsCard student={student} planName={planName} groups={groups} />

      <ProfileStatsGrid
        attendanceRate={attendanceRate}
        homeworkRate={homeworkRate}
        examAverage={examAverage}
        sessionCount={sessionAttendance.length}
      />

      <StudentTrendsSection data={data} />

      <ProfileSections
        data={data}
        attendanceRate={attendanceRate}
        isCollapsed={isCollapsed}
        toggle={toggle}
        onManageSkills={() => setSkillsOpen(true)}
        onManageWeakPoints={() => setWeakPointsOpen(true)}
      />

      <StudentSkillsDialog
        open={skillsOpen}
        studentId={student.id}
        studentName={student.name}
        onClose={() => setSkillsOpen(false)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

      <WeakPointsDialog
        open={weakPointsOpen}
        studentId={student.id}
        onClose={() => setWeakPointsOpen(false)}
        onChanged={() => setReloadKey((k) => k + 1)}
      />

      <StudentFormDialog
        open={editOpen}
        student={student}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          setReloadKey((k) => k + 1);
        }}
      />

      <StudentStatementDialog
        open={statementOpen}
        studentId={student.id}
        studentName={student.name}
        onClose={() => setStatementOpen(false)}
      />

      <SendWhatsAppDialog open={whatsAppOpen} data={data} onClose={() => setWhatsAppOpen(false)} />
    </div>
  );
}
