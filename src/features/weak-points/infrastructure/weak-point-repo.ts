import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { weakPoints, type WeakPoint } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";

/**
 * Weak-points repository: generic CRUD plus a per-student listing sorted
 * unresolved-first, then by recorded date (newest first).
 */
export const weakPointRepository = {
  ...createRepository(weakPoints),

  /** A student's weakness points, unresolved first, newest recorded first. */
  async byStudent(studentId: string): Promise<WeakPoint[]> {
    const rows = (await db
      .select()
      .from(weakPoints)
      .where(eq(weakPoints.studentId, studentId))
      .orderBy(asc(weakPoints.resolved), desc(weakPoints.recordedOn))) as WeakPoint[];
    return rows;
  },
};