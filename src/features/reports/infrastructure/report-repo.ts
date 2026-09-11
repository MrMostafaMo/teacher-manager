import { and, asc, desc, eq, gte, like, lt, lte, sql, count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  attendance,
  examResults,
  exams,
  expenses,
  payments,
  skills,
  studentGroups,
  studentSkills,
  students,
  studyGroups,
  weakPoints,
} from "@/lib/db/schema";
import { homeworks, homeworkSubmissions } from "@/lib/db/tables-homework";
import { sessionAttendance } from "@/lib/db/tables-attendance";
import { groupSessions } from "@/lib/db/tables-students";
import dayjs from "dayjs";
import { reportCountQueries } from "./report-repo-counts";

/**
 * Read-only queries behind the report builders. Aggregation stays in
 * application/; this file owns every `db.select` so use-cases stay pure.
 *
 * Flat lists accept `{ limit, offset }` (+ paired `count*`); report previews
 * page through them while Excel/PDF exports always use the full set.
 */
export interface ReportPage {
  limit?: number;
  offset?: number;
}

export function applyPage<T extends { limit: (n: number) => unknown; offset: (n: number) => unknown }>(
  query: T,
  page?: ReportPage,
): T {
  if (page?.limit !== undefined) query.limit(page.limit);
  if (page?.offset !== undefined) query.offset(page.offset);
  return query;
}

export const reportRepository = {
  listStudentsOrdered: (page?: ReportPage) =>
    applyPage(db.select().from(students).orderBy(students.name), page),
  listGroupsOrdered: () => db.select().from(studyGroups).orderBy(studyGroups.name),
  listMemberships: () => db.select().from(studentGroups),
  listSkillsOrdered: () => db.select().from(skills).orderBy(skills.name),
  listSkillLevels: () => db.select().from(studentSkills),
  listExamResults: () => db.select().from(examResults),
  listGroups: () => db.select().from(studyGroups),
  listStudents: () => db.select().from(students),

  listAttendance(period?: string) {
    const q = db.select().from(attendance);
    if (period) {
      const s = `${period}-01`;
      const e = dayjs(`${period}-01`).add(1, "month").format("YYYY-MM-DD");
      q.where(and(gte(attendance.date, s), lt(attendance.date, e)));
    }
    return q;
  },

  listPayments(period?: string) {
    const q = db.select().from(payments);
    if (period) q.where(eq(payments.period, period));
    return q;
  },

  listExams(period?: string, page?: ReportPage) {
    const q = db.select().from(exams).orderBy(desc(exams.createdAt));
    if (period) q.where(like(exams.date, `${period}-%`));
    return applyPage(q, page);
  },

  countExams: async (period?: string): Promise<number> => {
    const q = db.select({ n: count() }).from(exams);
    if (period) q.where(like(exams.date, `${period}-%`));
    const row = (await q.get()) as { n: number } | undefined;
    return row?.n ?? 0;
  },

  listMembershipsWithEnrollment() {
    return db
      .select({ groupId: studentGroups.groupId, studentId: studentGroups.studentId, enrolledOn: students.enrolledOn })
      .from(studentGroups)
      .innerJoin(students, eq(studentGroups.studentId, students.id));
  },

  listExpenses(period?: string, page?: ReportPage) {
    const q = db.select().from(expenses).orderBy(desc(expenses.spentAt));
    if (period) {
      const s = dayjs(`${period}-01`).startOf("month").valueOf();
      const e = dayjs(`${period}-01`).endOf("month").valueOf();
      q.where(and(gte(expenses.spentAt, s), lte(expenses.spentAt, e)));
    }
    return applyPage(q, page);
  },

  countExpenses: async (period?: string): Promise<number> => {
    const q = db.select({ n: count() }).from(expenses);
    if (period) {
      const s = dayjs(`${period}-01`).startOf("month").valueOf();
      const e = dayjs(`${period}-01`).endOf("month").valueOf();
      q.where(and(gte(expenses.spentAt, s), lte(expenses.spentAt, e)));
    }
    const row = (await q.get()) as { n: number } | undefined;
    return row?.n ?? 0;
  },

  homeworkAggregates(period?: string, page?: ReportPage) {
    const q = db
      .select({
        studentId: homeworkSubmissions.studentId,
        studentName: students.name,
        total: count(homeworks.id),
        completed: count(sql<number>`case when ${homeworkSubmissions.status} = 'submitted' then 1 end`),
        pending: count(sql<number>`case when ${homeworkSubmissions.status} = 'pending' then 1 end`),
        late: count(sql<number>`case when ${homeworkSubmissions.status} = 'late' then 1 end`),
      })
      .from(homeworkSubmissions)
      .innerJoin(homeworks, eq(homeworkSubmissions.homeworkId, homeworks.id))
      .innerJoin(students, eq(homeworkSubmissions.studentId, students.id));
    if (period) q.where(like(homeworks.dueDate, `${period}-%`));
    return applyPage(q.groupBy(homeworkSubmissions.studentId, students.name), page);
  },

  sessionAggregates(period?: string, page?: ReportPage) {
    const q = db
      .select({
        date: sessionAttendance.date,
        groupName: studyGroups.name,
        present: count(sql<number>`case when ${sessionAttendance.status} = 'present' then 1 end`),
        absent: count(sql<number>`case when ${sessionAttendance.status} = 'absent' then 1 end`),
        late: count(sql<number>`case when ${sessionAttendance.status} = 'late' then 1 end`),
        excused: count(sql<number>`case when ${sessionAttendance.status} = 'excused' then 1 end`),
        total: count(sessionAttendance.id),
      })
      .from(sessionAttendance)
      .innerJoin(groupSessions, eq(sessionAttendance.sessionId, groupSessions.id))
      .innerJoin(studyGroups, eq(groupSessions.groupId, studyGroups.id));
    if (period) q.where(like(sessionAttendance.date, `${period}-%`));
    return applyPage(q.groupBy(sessionAttendance.date, studyGroups.name).orderBy(sessionAttendance.date), page);
  },

  listWeakPointsJoined(page?: ReportPage) {
    const q = db
      .select({ name: students.name, description: weakPoints.description, recordedOn: weakPoints.recordedOn, resolved: weakPoints.resolved })
      .from(weakPoints)
      .innerJoin(students, eq(weakPoints.studentId, students.id))
      .orderBy(asc(students.name), desc(weakPoints.recordedOn));
    return applyPage(q, page);
  },

  ...reportCountQueries,
};
