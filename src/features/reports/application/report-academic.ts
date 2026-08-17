import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";
import { homeworks, homeworkSubmissions } from "@/lib/db/tables-homework";
import { sessionAttendance } from "@/lib/db/tables-attendance";
import { students, studyGroups, groupSessions } from "@/lib/db/tables-students";
import { eq, count } from "drizzle-orm";
import type { ReportData } from "../domain";
import type { ReportTranslations } from "./report-builders";

export async function homeworkReport(t: ReportTranslations): Promise<ReportData> {
  const rows = await db
    .select({
      studentId: homeworkSubmissions.studentId,
      studentName: students.name,
      total: count(homeworks.id),
      completed: count(
        sql<number>`case when ${homeworkSubmissions.status} = 'submitted' then 1 end`,
      ),
      pending: count(
        sql<number>`case when ${homeworkSubmissions.status} = 'pending' then 1 end`,
      ),
      late: count(
        sql<number>`case when ${homeworkSubmissions.status} = 'late' then 1 end`,
      ),
    })
    .from(homeworkSubmissions)
    .innerJoin(homeworks, eq(homeworkSubmissions.homeworkId, homeworks.id))
    .innerJoin(students, eq(homeworkSubmissions.studentId, students.id))
    .groupBy(homeworkSubmissions.studentId, students.name);

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

export async function sessionAttendanceReport(t: ReportTranslations): Promise<ReportData> {
  const rows = await db
    .select({
      date: sessionAttendance.date,
      groupName: studyGroups.name,
      present: count(
        sql<number>`case when ${sessionAttendance.status} = 'present' then 1 end`,
      ),
      absent: count(
        sql<number>`case when ${sessionAttendance.status} = 'absent' then 1 end`,
      ),
      late: count(
        sql<number>`case when ${sessionAttendance.status} = 'late' then 1 end`,
      ),
      excused: count(
        sql<number>`case when ${sessionAttendance.status} = 'excused' then 1 end`,
      ),
      total: count(sessionAttendance.id),
    })
    .from(sessionAttendance)
    .innerJoin(groupSessions, eq(sessionAttendance.sessionId, groupSessions.id))
    .innerJoin(studyGroups, eq(groupSessions.groupId, studyGroups.id))
    .groupBy(sessionAttendance.date, studyGroups.name)
    .orderBy(sessionAttendance.date);

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
