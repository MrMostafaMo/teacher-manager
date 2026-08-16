import type { StudentProfileData } from "./student-profile-cases";

/**
 * Pure profile summary: attendance rate, exam average and homework
 * completion. Shared by the header KPIs and WhatsApp template variables.
 */
export interface ProfileSummary {
  attendanceRate: number | null;
  examAverage: number | null;
  homeworkRate: number | null;
}

export function computeProfileSummary(data: StudentProfileData): ProfileSummary {
  const { attendanceStats, exams, homeworks } = data;
  const marked =
    attendanceStats.present + attendanceStats.absent + attendanceStats.late + attendanceStats.excused;
  const attended = attendanceStats.present + attendanceStats.late + attendanceStats.excused;
  const attendanceRate = marked > 0 ? Math.round((attended / marked) * 100) : null;

  const gradedExams = exams.filter((e) => e.score !== null);
  const examAverage =
    gradedExams.length > 0
      ? Math.round(
          (gradedExams.reduce(
            (a, e) => a + Math.min(100, ((e.score ?? 0) / e.maxScore) * 100),
            0,
          ) /
            gradedExams.length) * 10,
        ) / 10
      : null;

  const homeworkDone = homeworks.filter((h) => h.status !== "pending").length;
  const homeworkRate =
    homeworks.length > 0 ? Math.round((homeworkDone / homeworks.length) * 100) : null;
  return { attendanceRate, examAverage, homeworkRate };
}