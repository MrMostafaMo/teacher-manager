import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { groupSessions, studyGroups, type GroupSession } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";

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
};
