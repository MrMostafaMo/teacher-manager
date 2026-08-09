import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  groupSessions,
  sessionAttendance,
  studyGroups,
  type GroupSession,
  type SessionAttendance,
} from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";
import type { AttendanceStatus } from "@/features/attendance/domain";

/** A session joined with its group's name + status (for the timetable). */
export interface SessionWithGroup extends GroupSession {
  groupName: string;
  groupStatus: "active" | "inactive";
  /** First date the group's sessions take effect; NULL = no bound. */
  groupStartsOn: string | null;
}

export const scheduleRepository = {
  ...createRepository(groupSessions),

  /** Every session, joined with the group name, sorted by day then time. */
  async listAll(): Promise<SessionWithGroup[]> {
    const rows = await db
      .select({
        id: groupSessions.id,
        groupId: groupSessions.groupId,
        dayOfWeek: groupSessions.dayOfWeek,
        startTime: groupSessions.startTime,
        endTime: groupSessions.endTime,
        room: groupSessions.room,
        createdAt: groupSessions.createdAt,
        updatedAt: groupSessions.updatedAt,
        groupName: studyGroups.name,
        groupStatus: studyGroups.status,
        groupStartsOn: studyGroups.startsOn,
      })
      .from(groupSessions)
      .innerJoin(studyGroups, eq(groupSessions.groupId, studyGroups.id))
      .orderBy(asc(groupSessions.dayOfWeek), asc(groupSessions.startTime));
    return rows as unknown as SessionWithGroup[];
  },

  /** Delete every session of a group (used when the group is deleted). */
  async clearForGroup(groupId: string): Promise<void> {
    // SQLite FKs are off — clear each session's attendance rows first or the
    // session rows orphan their sheets.
    const sessions = (await db
      .select({ id: groupSessions.id })
      .from(groupSessions)
      .where(eq(groupSessions.groupId, groupId))) as Array<{ id: string }>;
    if (sessions.length > 0) {
      await db
        .delete(sessionAttendance)
        .where(
          inArray(
            sessionAttendance.sessionId,
            sessions.map((s) => s.id),
          ),
        );
    }
    await db.delete(groupSessions).where(eq(groupSessions.groupId, groupId));
  },

  /** A student's session-attendance rows joined with their session + group. */
  async sessionAttendanceByStudent(
    studentId: string,
  ): Promise<
    Array<
      SessionAttendance & {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
        groupName: string;
      }
    >
  > {
    const rows = await db
      .select({
        id: sessionAttendance.id,
        sessionId: sessionAttendance.sessionId,
        studentId: sessionAttendance.studentId,
        groupId: groupSessions.groupId,
        date: sessionAttendance.date,
        status: sessionAttendance.status,
        createdAt: sessionAttendance.createdAt,
        updatedAt: sessionAttendance.updatedAt,
        dayOfWeek: groupSessions.dayOfWeek,
        startTime: groupSessions.startTime,
        endTime: groupSessions.endTime,
        room: groupSessions.room,
        groupName: studyGroups.name,
      })
      .from(sessionAttendance)
      .innerJoin(groupSessions, eq(sessionAttendance.sessionId, groupSessions.id))
      .innerJoin(studyGroups, eq(groupSessions.groupId, studyGroups.id))
      .where(eq(sessionAttendance.studentId, studentId))
      .orderBy(desc(sessionAttendance.date));
    return rows as unknown as Array<
      SessionAttendance & {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
        groupName: string;
      }
    >;
  },

  /** Attendance rows for one session occurrence (SQLite FKs are off — no cascade). */
  async sessionAttendanceBy(sessionId: string, date: string) {
    const rows = await db
      .select()
      .from(sessionAttendance)
      .where(
        and(
          eq(sessionAttendance.sessionId, sessionId),
          eq(sessionAttendance.date, date),
        ),
      )
      .orderBy(asc(sessionAttendance.studentId));
    return rows as unknown as typeof sessionAttendance.$inferSelect[];
  },

  /** Replace one session sheet: delete-then-insert, idempotent per (session, date). */
  async replaceSessionAttendance(
    sessionId: string,
    date: string,
    entries: Array<{ studentId: string; status: AttendanceStatus }>,
  ): Promise<void> {
    await db
      .delete(sessionAttendance)
      .where(
        and(eq(sessionAttendance.sessionId, sessionId), eq(sessionAttendance.date, date)),
      );
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
    await db.delete(sessionAttendance).where(eq(sessionAttendance.sessionId, sessionId));
  },

  /** Delete a student's session-attendance rows (used when the student is deleted). */
  async clearAttendanceForStudent(studentId: string): Promise<void> {
    await db.delete(sessionAttendance).where(eq(sessionAttendance.studentId, studentId));
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
