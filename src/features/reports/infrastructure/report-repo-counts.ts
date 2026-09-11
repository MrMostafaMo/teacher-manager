import { and, eq, gte, inArray, like, lt, sql, count, countDistinct } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  attendance,
  payments,
  studentSkills,
  students,
  studyGroups,
  weakPoints,
} from "@/lib/db/schema";
import { homeworks, homeworkSubmissions } from "@/lib/db/tables-homework";
import { sessionAttendance } from "@/lib/db/tables-attendance";
import { groupSessions } from "@/lib/db/tables-students";
import dayjs from "dayjs";

/**
 * Pager totals + enrolled-window queries behind the report builders.
 * Merged into `reportRepository` (see report-repo.ts) to keep one import.
 */
export const reportCountQueries = {
  countStudents: async (): Promise<number> => {
    const row = (await db.select({ n: count() }).from(students).get()) as
      | { n: number }
      | undefined;
    return row?.n ?? 0;
  },

  /** Period facts constrained to the visible enrolled-student window. */
  listAttendanceForStudents(period: string | undefined, studentIds: string[]) {
    if (studentIds.length === 0) return Promise.resolve([]);
    const q = db.select().from(attendance);
    const start = period ? `${period}-01` : undefined;
    const end = period ? dayjs(`${period}-01`).add(1, "month").format("YYYY-MM-DD") : undefined;
    q.where(
      and(
        inArray(attendance.studentId, studentIds),
        start && end ? and(gte(attendance.date, start), lt(attendance.date, end)) : undefined,
      ),
    );
    return q;
  },

  listPaymentsForStudents(period: string | undefined, studentIds: string[]) {
    if (studentIds.length === 0) return Promise.resolve([]);
    const q = db.select().from(payments);
    q.where(
      and(
        inArray(payments.studentId, studentIds),
        period ? eq(payments.period, period) : undefined,
      ),
    );
    return q;
  },

  listSkillLevelsForStudents(studentIds: string[]) {
    if (studentIds.length === 0) return Promise.resolve([]);
    return db
      .select()
      .from(studentSkills)
      .where(inArray(studentSkills.studentId, studentIds));
  },

  countHomeworkGroups: async (period?: string): Promise<number> => {
    const q = db
      .select({ n: countDistinct(homeworkSubmissions.studentId) })
      .from(homeworkSubmissions)
      .innerJoin(homeworks, eq(homeworkSubmissions.homeworkId, homeworks.id));
    if (period) q.where(like(homeworks.dueDate, `${period}-%`));
    const row = (await q.get()) as { n: number } | undefined;
    return row?.n ?? 0;
  },

  countSessionGroups: async (period?: string): Promise<number> => {
    const q = db
      .select({ n: countDistinct(sql<string>`${sessionAttendance.date} || ${studyGroups.name}`) })
      .from(sessionAttendance)
      .innerJoin(groupSessions, eq(sessionAttendance.sessionId, groupSessions.id))
      .innerJoin(studyGroups, eq(groupSessions.groupId, studyGroups.id));
    if (period) q.where(like(sessionAttendance.date, `${period}-%`));
    const row = (await q.get()) as { n: number } | undefined;
    return row?.n ?? 0;
  },

  countWeakPoints: async (): Promise<number> => {
    const row = (await db.select({ n: count() }).from(weakPoints).get()) as
      | { n: number }
      | undefined;
    return row?.n ?? 0;
  },
};
