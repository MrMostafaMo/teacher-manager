import { and, asc, count, eq, notInArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  groupSessions,
  studentGroups,
  students,
  studyGroups,
  type Student,
  type StudyGroup,
} from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { compareGroupsWithRoom, firstSessionRoom } from "@/lib/utils/group-sort";
import { uuid } from "@/lib/utils/uuid";

/**
 * Study-groups repository: the generic CRUD over `study_groups` plus
 * membership queries over the `student_groups` join table.
 */
export interface GroupWithCount extends StudyGroup {
  memberCount: number;
}

export const groupRepository = {
  ...createRepository(studyGroups),

  async list(): Promise<GroupWithCount[]> {
    const groups = (await db.select().from(studyGroups)) as StudyGroup[];
    const sessions = (await db
      .select({
        groupId: groupSessions.groupId,
        dayOfWeek: groupSessions.dayOfWeek,
        startTime: groupSessions.startTime,
        room: groupSessions.room,
      })
      .from(groupSessions)) as Array<{
      groupId: string;
      dayOfWeek: number;
      startTime: string;
      room: string | null;
    }>;
    const bySessionGroup = new Map<string, Array<(typeof sessions)[number]>>();
    for (const s of sessions) {
      const bucket = bySessionGroup.get(s.groupId) ?? [];
      bucket.push(s);
      bySessionGroup.set(s.groupId, bucket);
    }
    groups.sort((a, b) =>
      compareGroupsWithRoom(
        { name: a.name, room: firstSessionRoom(bySessionGroup.get(a.id) ?? []) },
        { name: b.name, room: firstSessionRoom(bySessionGroup.get(b.id) ?? []) },
      ),
    );
    const counts = (await db
      .select({ groupId: studentGroups.groupId, n: count() })
      .from(studentGroups)
      .groupBy(studentGroups.groupId)) as Array<{ groupId: string; n: number }>;
    const byId = new Map(counts.map((c) => [c.groupId, c.n]));
    return groups.map((g) => ({ ...g, memberCount: byId.get(g.id) ?? 0 }));
  },

  /** Students currently in a group, name-asc. */
  async members(groupId: string): Promise<Student[]> {
    const rows = await db
      .select({
        id: students.id,
        name: students.name,
        phone: students.phone,
        guardianName: students.guardianName,
        guardianPhone: students.guardianPhone,
        status: students.status,
        notes: students.notes,
        planId: students.planId,
        enrolledOn: students.enrolledOn,
        birthDate: students.birthDate,
        gradeLevel: students.gradeLevel,
        photoUrl: students.photoUrl,
        isExempt: students.isExempt,
        exemptReason: students.exemptReason,
        exemptNote: students.exemptNote,
        createdAt: students.createdAt,
        updatedAt: students.updatedAt,
      })
      .from(studentGroups)
      .innerJoin(students, eq(studentGroups.studentId, students.id))
      .where(eq(studentGroups.groupId, groupId))
      .orderBy(asc(students.name));
    return rows as Student[];
  },

  /** Active students with no group at all, name-asc (candidates to add — one class per student). */
  async nonMembers(): Promise<Student[]> {
    const anyMemberIds = db.select({ id: studentGroups.studentId }).from(studentGroups);
    const rows = await db
      .select()
      .from(students)
      .where(and(eq(students.status, "active"), notInArray(students.id, anyMemberIds)))
      .orderBy(asc(students.name));
    return rows as Student[];
  },

  async addMember(studentId: string, groupId: string): Promise<void> {
    const ts = Date.now();
    await db
      .insert(studentGroups)
      .values({ id: uuid(), studentId, groupId, createdAt: ts, updatedAt: ts });
  },

  async removeMember(studentId: string, groupId: string): Promise<boolean> {
    const result = (await db
      .delete(studentGroups)
      .where(and(eq(studentGroups.studentId, studentId), eq(studentGroups.groupId, groupId)))
      .run()) as unknown as { rows?: Array<{ changes?: number }> };
    return (result.rows?.[0]?.changes ?? 0) > 0;
  },

  /** Delete every membership of a group (SQLite FKs are off — no cascade). */
  async clearMembers(groupId: string): Promise<void> {
    await db.delete(studentGroups).where(eq(studentGroups.groupId, groupId)).run();
  },

  /** Every membership of a student (used on student delete). */
  async clearForStudent(studentId: string): Promise<void> {
    await db.delete(studentGroups).where(eq(studentGroups.studentId, studentId)).run();
  },

  /** Every membership joined with its group name (for payments grouping). */
  async memberships(): Promise<Array<{ studentId: string; groupId: string; groupName: string }>> {
    const rows = await db
      .select({
        studentId: studentGroups.studentId,
        groupId: studentGroups.groupId,
        groupName: studyGroups.name,
      })
      .from(studentGroups)
      .innerJoin(studyGroups, eq(studentGroups.groupId, studyGroups.id));
    return rows as Array<{ studentId: string; groupId: string; groupName: string }>;
  },
};
