import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  groupSessions,
  sessionAttendance,
  studyGroups,
  type GroupSession,
  type SessionAttendance,
} from "@/lib/db/schema";

/** A session joined with its group's name + status (for the timetable). */
export interface SessionWithGroup extends GroupSession {
  groupName: string;
  groupStatus: "active" | "inactive";
  /** First date the group's sessions take effect; NULL = no bound. */
  groupStartsOn: string | null;
}

export interface SessionAttendanceWithGroup extends SessionAttendance {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  groupName: string;
}

/** Every session, joined with the group name, sorted by day then time. */
export async function listAllSessions(): Promise<SessionWithGroup[]> {
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
}

/** A student's session-attendance rows joined with their session + group. */
export async function sessionAttendanceByStudent(
  studentId: string,
): Promise<SessionAttendanceWithGroup[]> {
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
  return rows as unknown as SessionAttendanceWithGroup[];
}
