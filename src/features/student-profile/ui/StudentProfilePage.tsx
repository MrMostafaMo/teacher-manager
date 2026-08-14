import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
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
import { AttendanceSection, HomeworkSection, PaymentsSection } from "./profile-records-a";
import {
  ActivitySection,
  ExamsSection,
  SessionsSection,
  SkillsSection,
  WeakPointsSection,
} from "./profile-records-b";
import { ProfileFactsCard, ProfileStatsGrid, useProfileSummary } from "./profile-overview";
import { ProfileHeader } from "./profile-header";
import { ProfilePageSkeleton } from "./profile-skeleton";

export default function StudentProfilePage() {
  const { id = "" } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [weakPointsOpen, setWeakPointsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    getStudentProfile(id)
      .then(setData)
      .catch((e) => {
        console.error("Failed to load student profile", e);
        setError(t("profile.loadError"));
      })
      .finally(() => setLoading(false));
  }, [id, reloadKey, t]);

  const { busy: reportCardBusy, run: runReportCard } = useReportCard(data);

  if (loading) {
    return <ProfilePageSkeleton />;
  }
  if (error || !data) {
    return <p className="py-16 text-center text-destructive">{error || t("profile.notFound")}</p>;
  }

  const {
    student,
    planName,
    groups,
    attendanceStats,
    attendanceHistory,
    payments,
    homeworks,
    exams,
    sessionAttendance,
    skills,
    weakPoints,
    activity,
  } = data;

  const { attendanceRate, examAverage, homeworkRate } = useProfileSummary(data);

  return (
    <div className="space-y-6">
      <ProfileHeader
        student={student}
        onEdit={() => setEditOpen(true)}
        onStatement={() => setStatementOpen(true)}
        onReportCard={runReportCard}
        reportCardBusy={reportCardBusy}
        onWhatsApp={() => setWhatsAppOpen(true)}
      />

      <ProfileFactsCard student={student} planName={planName} groups={groups} />

      <ProfileStatsGrid
        attendanceRate={attendanceRate}
        homeworkRate={homeworkRate}
        examAverage={examAverage}
        sessionCount={sessionAttendance.length}
      />

      <StudentTrendsSection data={data} />

      <Separator />
      <AttendanceSection rows={attendanceHistory} stats={attendanceStats} rate={attendanceRate} />

      <Separator />
      <PaymentsSection rows={payments} />

      <Separator />
      <HomeworkSection rows={homeworks} />

      <Separator />
      <ExamsSection rows={exams} />

      <Separator />
      <SessionsSection rows={sessionAttendance} />

      <Separator />
      <SkillsSection skills={skills} onManage={() => setSkillsOpen(true)} />

      <Separator />
      <WeakPointsSection weakPoints={weakPoints} onManage={() => setWeakPointsOpen(true)} />

      {activity.length > 0 && (
        <>
          <Separator />
          <ActivitySection rows={activity.slice(0, 10)} />
        </>
      )}

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

      <SendWhatsAppDialog
        open={whatsAppOpen}
        data={data}
        onClose={() => setWhatsAppOpen(false)}
      />
    </div>
  );
}
