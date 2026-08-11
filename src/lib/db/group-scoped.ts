import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { studentGroups, students, studyGroups } from "@/lib/db/schema";

/** groupIds of every group the student belongs to. */
export async function groupIdsForStudent(studentId: string): Promise<string[]> {
  const memberships = await db
    .select({ groupId: studentGroups.groupId })
    .from(studentGroups)
    .where(eq(studentGroups.studentId, studentId));
  return memberships.map((m) => m.groupId);
}

/** id → name for every study group. */
export async function groupNames(): Promise<Map<string, string>> {
  const rows = await db.select({ id: studyGroups.id, name: studyGroups.name }).from(studyGroups);
  return new Map(rows.map((g) => [g.id, g.name]));
}

/**
 * Subquery of student ids that are members of `groupId` and enrolled on or
 * before `refDate` (used to prune submissions/results when a group changes).
 */
export function eligibleStudentIds(groupId: string, refDate: string) {
  return db
    .select({ studentId: studentGroups.studentId })
    .from(studentGroups)
    .innerJoin(students, eq(studentGroups.studentId, students.id))
    .where(
      and(
        eq(studentGroups.groupId, groupId),
        or(isNull(students.enrolledOn), lte(students.enrolledOn, refDate)),
      ),
    );
}
