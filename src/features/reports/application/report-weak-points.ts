import { asc, desc, eq } from "drizzle-orm";
import dayjs from "dayjs";
import { db } from "@/lib/db/client";
import { students, weakPoints } from "@/lib/db/schema";
import type { ReportData } from "@/features/reports/domain";
import type { ReportTranslations } from "./report-builders";

/**
 * Weak points report: one flat row per weakness, ordered by student name
 * then recorded date (newest first). All weaknesses are included — the
 * status column separates active from resolved.
 */
export async function weakPointsReport(t: ReportTranslations): Promise<ReportData> {
  const rows = (await db
    .select({
      name: students.name,
      description: weakPoints.description,
      recordedOn: weakPoints.recordedOn,
      resolved: weakPoints.resolved,
    })
    .from(weakPoints)
    .innerJoin(students, eq(weakPoints.studentId, students.id))
    .orderBy(asc(students.name), desc(weakPoints.recordedOn))) as Array<{
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
      t.weakStatus?.(r.resolved === 1 ? "resolved" : "active") ?? (r.resolved === 1 ? "resolved" : "active"),
    ]),
  };
}
