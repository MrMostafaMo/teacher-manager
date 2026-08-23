import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { groupSessions, sessionAttendance, sessionExceptions } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";
import type { AttendanceStatus } from "@/features/attendance/domain";
import { listAllSessions, sessionAttendanceByStudent } from "./schedule-queries";

export type { SessionWithGroup } from "./schedule-queries";

export const scheduleRepository = {
  ...createRepository(groupSessions),

  /** Every session, joined with the group name, sorted by day then time. */
  listAll: listAllSessions,

  /** Delete every session of a group (used when the group is deleted). */
  async clearForGroup(groupId: string): Promise<void> {
    // SQLite FKs are off — clear each session's attendance rows first or the
    // session rows orphan their sheets.
    const sessions = (await db
      .select({ id: groupSessions.id })
      .from(groupSessions)
      .where(eq(groupSessions.groupId, groupId))) as Array<{ id: string }>;
    if (sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      await db.delete(sessionAttendance).where(inArray(sessionAttendance.sessionId, sessionIds)).run();
      await db.delete(sessionExceptions).where(inArray(sessionExceptions.sessionId, sessionIds)).run();
    }
    await db.delete(groupSessions).where(eq(groupSessions.groupId, groupId)).run();
  },

  /** A student's session-attendance rows joined with their session + group. */
  sessionAttendanceByStudent,

  /** Attendance rows for one session occurrence (SQLite FKs are off — no cascade). */
  async sessionAttendanceBy(sessionId: string, date: string) {
    const rows = await db
      .select()
      .from(sessionAttendance)
      .where(and(eq(sessionAttendance.sessionId, sessionId), eq(sessionAttendance.date, date)))
      .orderBy(asc(sessionAttendance.studentId));
    return rows as unknown as (typeof sessionAttendance.$inferSelect)[];
  },

  /** Replace one session sheet: delete-then-insert, idempotent per (session, date). */
  async replaceSessionAttendance(
    sessionId: string,
    date: string,
    entries: Array<{ studentId: string; status: AttendanceStatus }>,
  ): Promise<void> {
    await db
      .delete(sessionAttendance)
      .where(and(eq(sessionAttendance.sessionId, sessionId), eq(sessionAttendance.date, date)));
    const ts = Date.now();
    await db.insert(sessionAttendance).values(
      entries.map((e) => ({
        id: uuid(),
        sessionId,
        studentId: e.studentId,
        date,
        status: e.status,
        createdAt: ts,
        updatedAt: ts,
      })),
    );
  },

  /** Delete a session's attendance rows (used when the session is deleted). */
  async clearForSession(sessionId: string): Promise<void> {
    await db.delete(sessionAttendance).where(eq(sessionAttendance.sessionId, sessionId)).run();
    await db.delete(sessionExceptions).where(eq(sessionExceptions.sessionId, sessionId)).run();
  },

  /** Delete a student's session-attendance rows (used when the student is deleted). */
  async clearAttendanceForStudent(studentId: string): Promise<void> {
    await db.delete(sessionAttendance).where(eq(sessionAttendance.studentId, studentId)).run();
  },

  /** Delete a student's rows on a group's session sheets (used on member removal). */
  async clearAttendanceForStudentInGroup(studentId: string, groupId: string): Promise<void> {
    const sessions = db
      .select({ id: groupSessions.id })
      .from(groupSessions)
      .where(eq(groupSessions.groupId, groupId));
    await db
      .delete(sessionAttendance)
      .where(
        and(
          eq(sessionAttendance.studentId, studentId),
          inArray(sessionAttendance.sessionId, sessions),
        ),
      );
  },
};
