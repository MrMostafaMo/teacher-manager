import dayjs from "dayjs";
import type { ReportData } from "@/features/reports/domain";
import type { ReportTranslations } from "./report-builders";
import { reportRepository, type ReportPage } from "@/features/reports/infrastructure/report-repo";

/**
 * Weak points report: one flat row per weakness, ordered by student name
 * then recorded date (newest first). All weaknesses are included — the
 * status column separates active from resolved.
 */
export async function weakPointsReport(t: ReportTranslations, page?: ReportPage): Promise<ReportData> {
  const rows = (await reportRepository.listWeakPointsJoined(page)) as Array<{
    name: string;
    description: string;
    recordedOn: number;
    resolved: number;
  }>;

  return {
    key: "weakPoints",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3]],
    rows: rows.map((r) => [
      r.name,
      r.description,
      dayjs(r.recordedOn).format("DD-MM-YYYY"),
      t.weakStatus?.(r.resolved === 1 ? "resolved" : "active") ??
        (r.resolved === 1 ? "resolved" : "active"),
    ]),
  };
}
