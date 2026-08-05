import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  groupSessions,
  sessionAttendance,
  studyGroups,
  type GroupSession,
} from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";

/** A session joined with its group's name + status (for the timetable). */
export interface SessionWithGroup extends GroupSession {
  groupName: string;
  groupStatus: "active" | "inactive";
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
      })
      .from(groupSessions)
      .innerJoin(studyGroups, eq(groupSessions.groupId, studyGroups.id))
      .orderBy(asc(groupSessions.dayOfWeek), asc(groupSessions.startTime));
    return rows as unknown as SessionWithGroup[];
  },

  /** Delete every session of a group (used when the group is deleted). */
  async clearForGroup(groupId: string): Promise<void> {
    await db.delete(groupSessions).where(eq(groupSessions.groupId, groupId));
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
    entries: Array<{ studentId: string; status: "present" | "absent" | "late" }>,
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
};
