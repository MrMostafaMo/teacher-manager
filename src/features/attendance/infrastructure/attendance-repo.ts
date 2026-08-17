import { and, count, desc, eq, gte, like, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { attendance, type Attendance } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";
import { currentMonth, lastMonths } from "@/lib/utils/months";
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
    return db.select().from(attendance).where(eq(attendance.date, date)) as Promise<Attendance[]>;
  },

  byStudentAndDate(studentId: string, date: string): Promise<Attendance | undefined> {
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

  /** Batch upsert: insert or update multiple attendance rows in one query. */
  async batchUpsert(
    entries: Array<{ studentId: string; date: string; status: AttendanceStatus }>,
  ): Promise<void> {
    if (entries.length === 0) return;
    const now = Date.now();
    await db
      .insert(attendance)
      .values(entries.map((e) => ({ id: uuid(), ...e, createdAt: now, updatedAt: now })))
      .onConflictDoUpdate({
        target: [attendance.studentId, attendance.date],
        set: { status: sql`excluded.status`, updatedAt: now },
      })
      .run();
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
      const stat = byId.get(row.studentId) ?? {
        studentId: row.studentId,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };
      stat[row.status] = row.n;
      byId.set(row.studentId, stat);
    }
    return [...byId.values()];
  },

  /** Every attendance row of a student, newest first (used in the profile). */
  byStudent(studentId: string): Promise<Attendance[]> {
    return db
      .select()
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .orderBy(desc(attendance.date)) as Promise<Attendance[]>;
  },

  /** Status counts for one student across all dates. */
  async statsForStudent(studentId: string): Promise<StudentMonthlyStat> {
    const rows = (await db
      .select({ status: attendance.status, n: count() })
      .from(attendance)
      .where(eq(attendance.studentId, studentId))
      .groupBy(attendance.status)) as Array<{ status: AttendanceStatus; n: number }>;
    const stat: StudentMonthlyStat = { studentId, present: 0, absent: 0, late: 0, excused: 0 };
    for (const row of rows) stat[row.status] = row.n;
    return stat;
  },

  /**
   * Every attendance row of a student (used on student delete).
   */
  async clearForStudent(studentId: string): Promise<void> {
    await db.delete(attendance).where(eq(attendance.studentId, studentId));
  },

  /**
   * Present/absent/late counts per month for the last `months` months ending
   * at `endMonth` (default: the current month), zero-filled so the trend
   * never has gaps.
   */
  async monthlyTrend(months: number, endMonth?: string): Promise<MonthlyTrendRow[]> {
    const labels = lastMonths(months, endMonth ?? currentMonth());
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
      const cur = byMonth.get(r.month) ?? {
        month: r.month,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
      };
      cur[r.status] = r.n;
      byMonth.set(r.month, cur);
    }
    return labels.map(
      (m) => byMonth.get(m) ?? { month: m, present: 0, absent: 0, late: 0, excused: 0 },
    );
  },
};
