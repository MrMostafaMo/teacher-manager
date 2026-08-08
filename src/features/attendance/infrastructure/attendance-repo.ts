import { and, count, eq, gte, like, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { attendance, type Attendance } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";
import type { AttendanceStatus } from "@/features/attendance/domain";

/**
 * Attendance repository: generic CRUD plus the two queries the feature needs —
 * one day's rows and per-student monthly counts.
 */
export interface StudentMonthlyStat {
  studentId: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface MonthlyTrendRow {
  month: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export const attendanceRepository = {
  ...createRepository(attendance),

  byDate(date: string): Promise<Attendance[]> {
    return db
      .select()
      .from(attendance)
      .where(eq(attendance.date, date)) as Promise<Attendance[]>;
  },

  byStudentAndDate(
    studentId: string,
    date: string,
  ): Promise<Attendance | undefined> {
    return db
      .select()
      .from(attendance)
      .where(and(eq(attendance.studentId, studentId), eq(attendance.date, date)))
      .get() as Promise<Attendance | undefined>;
  },

  /** Insert the day's row or update the existing one for this student. */
  async upsert(studentId: string, date: string, status: AttendanceStatus): Promise<void> {
    const existing = await attendanceRepository.byStudentAndDate(studentId, date);
    if (existing) await attendanceRepository.update(existing.id, { status });
    else await attendanceRepository.insert({ id: uuid(), studentId, date, status });
  },

  /** Per-student status counts for one month ("YYYY-MM"). */
  async monthlyStats(month: string): Promise<StudentMonthlyStat[]> {
    const rows = (await db
      .select({
        studentId: attendance.studentId,
        status: attendance.status,
        n: count(),
      })
      .from(attendance)
      .where(like(attendance.date, `${month}-%`))
      .groupBy(attendance.studentId, attendance.status)) as Array<{
      studentId: string;
      status: AttendanceStatus;
      n: number;
    }>;

    const byId = new Map<string, StudentMonthlyStat>();
    for (const row of rows) {
      const stat = byId.get(row.studentId) ?? { studentId: row.studentId, present: 0, absent: 0, late: 0, excused: 0 };
      stat[row.status] = row.n;
      byId.set(row.studentId, stat);
    }
    return [...byId.values()];
  },

  /**
   * Every attendance row of a student (used on student delete).
   */
  async clearForStudent(studentId: string): Promise<void> {
    await db.delete(attendance).where(eq(attendance.studentId, studentId));
  },

  /**
   * Present/absent/late counts per month for the last `months` months,
   * zero-filled so the trend never has gaps.
   */
  async monthlyTrend(months: number): Promise<MonthlyTrendRow[]> {
    const now = new Date();
    const labels: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const monthKey = sql`substr(${attendance.date}, 1, 7)`;
    const rows = (await db
      .select({ month: monthKey, status: attendance.status, n: count() })
      .from(attendance)
      .where(gte(attendance.date, `${labels[0]}-01`))
      .groupBy(monthKey, attendance.status)) as Array<{
      month: string;
      status: AttendanceStatus;
      n: number;
    }>;
    const byMonth = new Map<string, MonthlyTrendRow>();
    for (const r of rows) {
      const cur = byMonth.get(r.month) ?? { month: r.month, present: 0, absent: 0, late: 0, excused: 0 };
      cur[r.status] = r.n;
      byMonth.set(r.month, cur);
    }
    return labels.map((m) => byMonth.get(m) ?? { month: m, present: 0, absent: 0, late: 0, excused: 0 });
  },
};
