import { and, count, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import dayjs from "dayjs";
import { db } from "@/lib/db/client";
import { attendance, sessionAttendance, type Attendance } from "@/lib/db/schema";
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
    // Range predicate (index-friendly) instead of LIKE 'YYYY-MM-%'.
    const start = `${month}-01`;
    const end = dayjs(`${month}-01`).add(1, "month").format("YYYY-MM-DD");
    const rows = (await db
      .select({
        studentId: attendance.studentId,
        status: attendance.status,
        n: count(),
      })
      .from(attendance)
      .where(and(gte(attendance.date, start), lt(attendance.date, end)))
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

  /**
   * Per-student counted-session days (daily + timetable sheets) for
   * session-dues. Counts present/late/absent only — excused never moves
   * the counter. Deduped by date: a daily row + a sheet row on the same
   * day count as one session, so recording in both places can't double it.
   */
  async countsByStudent(): Promise<Array<{ studentId: string; n: number }>> {
    const consuming = ["present", "late", "absent"] as Array<AttendanceStatus>;
    const [daily, sheets] = (await Promise.all([
      db
        .select({ studentId: attendance.studentId, date: attendance.date })
        .from(attendance)
        .where(inArray(attendance.status, consuming)),
      db
        .select({ studentId: sessionAttendance.studentId, date: sessionAttendance.date })
        .from(sessionAttendance)
        .where(inArray(sessionAttendance.status, consuming)),
    ])) as Array<Array<{ studentId: string; date: string }>>;
    const days = new Map<string, Set<string>>();
    for (const row of [...daily, ...sheets]) {
      let set = days.get(row.studentId);
      if (!set) {
        set = new Set();
        days.set(row.studentId, set);
      }
      set.add(row.date);
    }
    return [...days].map(([studentId, set]) => ({ studentId, n: set.size }));
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
    await db.delete(attendance).where(eq(attendance.studentId, studentId)).run();
  },

  /**
   * Status counts per (month, student) from `startMonth` onward — one grouped
   * query backing the dashboard's monthly rows and trend chart. All-time
   * session counts stay on `countsByStudent` (different window, not derived).
   */
  async dashboardAggregates(
    startMonth: string,
  ): Promise<Array<{ month: string; studentId: string; status: AttendanceStatus; n: number }>> {
    const monthKey = sql`substr(${attendance.date}, 1, 7)`;
    const rows = (await db
      .select({
        month: monthKey,
        studentId: attendance.studentId,
        status: attendance.status,
        n: count(),
      })
      .from(attendance)
      .where(gte(attendance.date, `${startMonth}-01`))
      .groupBy(monthKey, attendance.studentId, attendance.status)) as Array<{
      month: string;
      studentId: string;
      status: AttendanceStatus;
      n: number;
    }>;
    return rows;
  },
};
