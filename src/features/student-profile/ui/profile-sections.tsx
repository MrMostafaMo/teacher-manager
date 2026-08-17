import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import { AttendanceSection, HomeworkSection, PaymentsSection } from "./profile-records-a";
import {
  ActivitySection,
  ExamsSection,
  SessionsSection,
  SkillsSection,
  WeakPointsSection,
} from "./profile-records-b";

/** Initial collapse state per section: empty sections start collapsed. */
export function profileSectionDefaults(data: StudentProfileData): Record<string, boolean> {
  return {
    attendance: data.attendanceHistory.length === 0,
    payments: data.payments.length === 0,
    homework: data.homeworks.length === 0,
    exams: data.exams.length === 0,
    sessions: data.sessionAttendance.length === 0,
    skills: data.skills.length === 0,
    weakPoints: data.weakPoints.length === 0,
    activity: data.activity.length === 0,
  };
}

export function ProfileSections({
  data,
  attendanceRate,
  isCollapsed,
  toggle,
  onManageSkills,
  onManageWeakPoints,
}: {
  data: StudentProfileData;
  attendanceRate: number | null;
  isCollapsed: (key: string) => boolean;
  toggle: (key: string) => void;
  onManageSkills: () => void;
  onManageWeakPoints: () => void;
}) {
  const {
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
  return (
    <>
      <AttendanceSection
        rows={attendanceHistory}
        stats={attendanceStats}
        rate={attendanceRate}
        collapsed={isCollapsed("attendance")}
        onToggle={() => toggle("attendance")}
      />
      <PaymentsSection
        rows={payments}
        collapsed={isCollapsed("payments")}
        onToggle={() => toggle("payments")}
      />
      <HomeworkSection
        rows={homeworks}
        collapsed={isCollapsed("homework")}
        onToggle={() => toggle("homework")}
      />
      <ExamsSection
        rows={exams}
        collapsed={isCollapsed("exams")}
        onToggle={() => toggle("exams")}
      />
      <SessionsSection
        rows={sessionAttendance}
        collapsed={isCollapsed("sessions")}
        onToggle={() => toggle("sessions")}
      />
      <SkillsSection
        skills={skills}
        onManage={onManageSkills}
        collapsed={isCollapsed("skills")}
        onToggle={() => toggle("skills")}
      />
      <WeakPointsSection
        weakPoints={weakPoints}
        onManage={onManageWeakPoints}
        collapsed={isCollapsed("weakPoints")}
        onToggle={() => toggle("weakPoints")}
      />
      {activity.length > 0 && (
        <ActivitySection
          rows={activity.slice(0, 10)}
          collapsed={isCollapsed("activity")}
          onToggle={() => toggle("activity")}
        />
      )}
    </>
  );
}
