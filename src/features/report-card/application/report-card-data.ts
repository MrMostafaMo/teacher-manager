import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import type { StudentMonthlyStat } from "@/features/attendance/infrastructure/attendance-repo";

export interface ReportCardData {
  studentName: string;
  groupNames: string[];
  enrolledOn: string | null;
  notes: string | null;
  attendance: StudentMonthlyStat;
  homeworkTotal: number;
  homeworkDone: number;
  exams: Array<{ title: string; score: number; maxScore: number }>;
  weakSkills: string[];
}

/** present + late + excused count as attended. */
export function attendanceRate(s: StudentMonthlyStat): number {
  const total = s.present + s.absent + s.late + s.excused;
  return total ? Math.round(((s.present + s.late + s.excused) / total) * 100) : 0;
}

/** Pure aggregation over the already-loaded profile data — no new queries. */
export function buildReportCardData(data: StudentProfileData): ReportCardData {
  const done = data.homeworks.filter((h) => h.status === "submitted" || h.status === "late").length;
  return {
    studentName: data.student.name,
    groupNames: data.groups.map((g) => g.name),
    enrolledOn: data.student.enrolledOn,
    notes: data.student.notes,
    attendance: { ...data.attendanceStats },
    homeworkTotal: data.homeworks.length,
    homeworkDone: done,
    exams: data.exams.flatMap((e) =>
      e.score === null ? [] : [{ title: e.title, score: e.score, maxScore: e.maxScore }],
    ),
    weakSkills: data.skills.filter((s) => s.weak).map((s) => s.name),
  };
}
