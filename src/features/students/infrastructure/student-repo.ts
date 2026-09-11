import { and, asc, count, eq, inArray, like, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  attendance,
  examResults,
  homeworkSubmissions,
  payments,
  sessionAttendance,
  studentGroups,
  studentSkills,
  students,
  type Student,
} from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";

function searchWhere(filters: StudentFilters) {
  const q = filters.query?.trim();
  const escaped = q ? q.replace(/[%_\\]/g, "\\$&") : undefined;
  return and(
    escaped
      ? or(
          like(students.name, `%${escaped}%`),
          like(students.phone, `%${escaped}%`),
          like(students.guardianName, `%${escaped}%`),
        )
      : undefined,
    filters.status && filters.status !== "all" ? eq(students.status, filters.status) : undefined,
  );
}

/**
 * Students repository: the generic CRUD repository plus a name/phone/guardian
 * search combined with an optional status filter.
 */
export interface StudentFilters {
  query?: string;
  status?: "active" | "inactive" | "all";
}

export const studentRepository = {
  ...createRepository(students),

  async search(
    filters: StudentFilters & { limit?: number; offset?: number } = {},
  ): Promise<Student[]> {
    const query = db.select().from(students).where(searchWhere(filters)).orderBy(asc(students.name));
    if (filters.limit !== undefined) query.limit(filters.limit);
    if (filters.offset !== undefined) query.offset(filters.offset);
    const rows = await query;
    return rows as Student[];
  },

  /** Filtered count with the same predicate as search (pager total). */
  async countSearch(filters: StudentFilters = {}): Promise<number> {
    const row = (await db
      .select({ n: count() })
      .from(students)
      .where(searchWhere(filters))
      .get()) as { n: number } | undefined;
    return row?.n ?? 0;
  },

  /** Lightweight id/name projection for pickers and name resolution. */
  async searchNames(
    filters: StudentFilters & { limit?: number } = {},
  ): Promise<Array<Pick<Student, "id" | "name" | "planId" | "status" | "enrolledOn" | "createdAt">>> {
    const q = filters.query?.trim();
    const escaped = q ? q.replace(/[%_\\]/g, "\\$&") : undefined;
    const query = db
      .select({
        id: students.id,
        name: students.name,
        planId: students.planId,
        status: students.status,
        enrolledOn: students.enrolledOn,
        createdAt: students.createdAt,
      })
      .from(students)
      .where(
        and(
          escaped ? like(students.name, `%${escaped}%`) : undefined,
          filters.status && filters.status !== "all"
            ? eq(students.status, filters.status)
            : undefined,
        ),
      )
      .orderBy(asc(students.name));
    if (filters.limit !== undefined) query.limit(filters.limit);
    const rows = await query;
    return rows as Array<Pick<Student, "id" | "name" | "planId" | "status" | "enrolledOn" | "createdAt">>;
  },

  /** Enrolled projection for reports/name lookups (avoids full-row scans). */
  async listEnrolled(): Promise<
    Array<{ id: string; name: string; planId: string | null; enrolledOn: string | null }>
  > {
    const rows = await db
      .select({ id: students.id, name: students.name, planId: students.planId, enrolledOn: students.enrolledOn })
      .from(students)
      .orderBy(asc(students.name));
    return rows as Array<{ id: string; name: string; planId: string | null; enrolledOn: string | null }>;
  },

  /** Detach every student from a plan (SQLite FKs are off — no cascade). */
  async clearPlan(planId: string): Promise<void> {
    await db
      .update(students)
      .set({ planId: null, updatedAt: Date.now() })
      .where(eq(students.planId, planId))
      .run();
  },

  /** Re-attach students to a plan after its delete is undone. */
  async restorePlan(planId: string, studentIds: string[]): Promise<void> {
    if (studentIds.length === 0) return;
    await db
      .update(students)
      .set({ planId, updatedAt: Date.now() })
      .where(inArray(students.id, studentIds))
      .run();
  },

  /**
   * Atomic student delete: single batch (BEGIN/COMMIT in the proxy) over the
   * student row plus every child table. Snapshot/restore stays in the case.
   */
  async removeCascade(id: string): Promise<void> {
    await db.batch([
      db.delete(studentSkills).where(eq(studentSkills.studentId, id)),
      db.delete(attendance).where(eq(attendance.studentId, id)),
      db.delete(payments).where(eq(payments.studentId, id)),
      db.delete(studentGroups).where(eq(studentGroups.studentId, id)),
      db.delete(homeworkSubmissions).where(eq(homeworkSubmissions.studentId, id)),
      db.delete(examResults).where(eq(examResults.studentId, id)),
      db.delete(sessionAttendance).where(eq(sessionAttendance.studentId, id)),
      db.delete(students).where(eq(students.id, id)),
    ]);
  },
};
