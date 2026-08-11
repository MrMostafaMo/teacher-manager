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
import { StudentStatementDialog } from "@/features/student-profile/ui/StudentStatementDialog";
import { StudentTrendsSection } from "@/features/student-profile/ui/StudentTrendsSection";
import { AttendanceSection, HomeworkSection, PaymentsSection } from "./profile-records-a";
import { ActivitySection, ExamsSection, SessionsSection, SkillsSection } from "./profile-records-b";
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
  const [editOpen, setEditOpen] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
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
    activity,
  } = data;

  const { attendanceRate, examAverage, homeworkRate } = useProfileSummary(data);

  return (
    <div className="space-y-6">
      <ProfileHeader
        student={student}
        onEdit={() => setEditOpen(true)}
        onStatement={() => setStatementOpen(true)}
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
    </div>
  );
}
