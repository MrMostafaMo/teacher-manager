import type { ReportData } from "../domain";
import type { ReportTranslations } from "./report-builders";
import { reportRepository, type ReportPage } from "@/features/reports/infrastructure/report-repo";

export async function homeworkReport(
  t: ReportTranslations,
  period?: string,
  page?: ReportPage,
): Promise<ReportData> {
  const rows = await reportRepository.homeworkAggregates(period, page);

  return {
    key: "homework",
    title: t.title,
    headers: t.headers,
    rows: rows.map((r) => {
      const rate = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
      return [r.studentName, r.total, r.completed, r.pending, r.late, `${rate}%`];
    }),
  };
}

export async function sessionAttendanceReport(
  t: ReportTranslations,
  period?: string,
  page?: ReportPage,
): Promise<ReportData> {
  const rows = await reportRepository.sessionAggregates(period, page);

  return {
    key: "sessionAttendance",
    title: t.title,
    headers: t.headers,
    rows: rows.map((r) => {
      const rate = r.total > 0 ? Math.round(((r.present + r.late) / r.total) * 100) : 0;
      return [r.date, r.groupName, r.present, r.absent, r.late, r.excused, `${rate}%`];
    }),
  };
}
