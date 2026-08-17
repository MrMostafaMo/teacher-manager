import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { skills, studentSkills, type Skill, type StudentSkill } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";
import type { SkillLevel } from "@/features/skills/domain";

/**
 * Skills repository: global catalog CRUD plus per-student mastery rows.
 * `student_skills` rows exist only when a level is set.
 */
export interface SkillWithWeakCount extends Skill {
  /** Students at or below `WEAK_LEVEL` for this skill. */
  weakCount: number;
  /** Students with any level set for this skill. */
  trackedCount: number;
}

export const skillRepository = {
  ...createRepository(skills),

  async list(): Promise<SkillWithWeakCount[]> {
    const [rows, tracked, weak] = await Promise.all([
      db.select().from(skills).orderBy(asc(skills.name)),
      db
        .select({ skillId: studentSkills.skillId, n: count() })
        .from(studentSkills)
        .groupBy(studentSkills.skillId),
      db
        .select({ skillId: studentSkills.skillId, n: count() })
        .from(studentSkills)
        .where(inArray(studentSkills.level, [1, 2]))
        .groupBy(studentSkills.skillId),
    ]);
    const trackedCount = new Map(
      (tracked as Array<{ skillId: string; n: number }>).map((r) => [r.skillId, r.n]),
    );
    const weakCount = new Map(
      (weak as Array<{ skillId: string; n: number }>).map((r) => [r.skillId, r.n]),
    );
    return (rows as Skill[]).map((s) => ({
      ...s,
      trackedCount: trackedCount.get(s.id) ?? 0,
      weakCount: weakCount.get(s.id) ?? 0,
    }));
  },

  /** Mastery rows for one student, keyed by skillId. */
  async levelsByStudent(studentId: string): Promise<Map<string, StudentSkill>> {
    const rows = (await db
      .select()
      .from(studentSkills)
      .where(eq(studentSkills.studentId, studentId))) as StudentSkill[];
    return new Map(rows.map((r) => [r.skillId, r]));
  },

  async upsertLevel(
    studentId: string,
    skillId: string,
    level: SkillLevel,
    note: string | null,
  ): Promise<void> {
    const existing = await db
      .select({ id: studentSkills.id })
      .from(studentSkills)
      .where(and(eq(studentSkills.studentId, studentId), eq(studentSkills.skillId, skillId)))
      .get();
    const ts = Date.now();
    if (existing) {
      await db
        .update(studentSkills)
        .set({ level, note, updatedAt: ts })
        .where(eq(studentSkills.id, existing.id));
    } else {
      await db.insert(studentSkills).values({
        id: uuid(),
        studentId,
        skillId,
        level,
        note,
        createdAt: ts,
        updatedAt: ts,
      });
    }
  },

  async removeLevel(studentId: string, skillId: string): Promise<void> {
    await db
      .delete(studentSkills)
      .where(and(eq(studentSkills.studentId, studentId), eq(studentSkills.skillId, skillId)));
  },

  /** Every mastery row of a skill (used on skill delete). */
  async clearForSkill(skillId: string): Promise<void> {
    await db.delete(studentSkills).where(eq(studentSkills.skillId, skillId));
  },

  /** Every mastery row of a student (used on student delete). */
  async clearForStudent(studentId: string): Promise<void> {
    await db.delete(studentSkills).where(eq(studentSkills.studentId, studentId));
  },
};
