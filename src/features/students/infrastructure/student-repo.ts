import { and, asc, eq, inArray, like, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { students, type Student } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";

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

  async search(filters: StudentFilters = {}): Promise<Student[]> {
    const q = filters.query?.trim();
    const escaped = q ? q.replace(/[%_\\]/g, "\\$&") : undefined;
    const rows = await db
      .select()
      .from(students)
      .where(
        and(
          escaped
            ? or(
                like(students.name, `%${escaped}%`),
                like(students.phone, `%${escaped}%`),
                like(students.guardianName, `%${escaped}%`),
              )
            : undefined,
          filters.status && filters.status !== "all"
            ? eq(students.status, filters.status)
            : undefined,
        ),
      )
      .orderBy(asc(students.name));
    return rows as Student[];
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
};
