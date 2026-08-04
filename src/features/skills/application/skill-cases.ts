import type { Skill } from "@/lib/db/schema";
import { skillRepository, type SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import {
  SKILL_LEVELS,
  skillInputSchema,
  studentSkillInputSchema,
  WEAK_LEVEL,
  type SkillInput,
  type StudentSkillInput,
} from "@/features/skills/domain";
import { logActivity } from "@/lib/activity-log";
import { uuid } from "@/lib/utils/uuid";

/**
 * Skill use cases. A student's skills are a batch of rows over the global
 * catalog — empty level removes the row, set level upserts it.
 */

export interface StudentSkillRow {
  skillId: string;
  name: string;
  level: number | null;
  note: string | null;
  weak: boolean;
}

export async function listSkills(): Promise<SkillWithWeakCount[]> {
  return skillRepository.list();
}

export async function createSkill(input: SkillInput): Promise<Skill> {
  const data = skillInputSchema.parse(input);
  const skill = await skillRepository.insert({ id: uuid(), name: data.name });
  await logActivity({
    action: "skill.create",
    entityType: "skill",
    entityId: skill.id,
    details: { name: skill.name },
  });
  return skill;
}

export async function updateSkill(
  id: string,
  input: SkillInput,
): Promise<Skill | undefined> {
  const data = skillInputSchema.parse(input);
  const skill = await skillRepository.update(id, { name: data.name });
  if (skill) {
    await logActivity({
      action: "skill.update",
      entityType: "skill",
      entityId: id,
      details: { name: skill.name },
    });
  }
  return skill;
}

export async function deleteSkill(id: string): Promise<boolean> {
  const skill = await skillRepository.findById(id);
  await skillRepository.clearForSkill(id);
  const ok = await skillRepository.remove(id);
  if (ok && skill) {
    await logActivity({
      action: "skill.delete",
      entityType: "skill",
      entityId: id,
      details: { name: skill.name },
    });
  }
  return ok;
}

/** Every catalog skill with this student's mastery row (if any). */
export async function getStudentSkills(studentId: string): Promise<StudentSkillRow[]> {
  const [skills, levels] = await Promise.all([
    skillRepository.list(),
    skillRepository.levelsByStudent(studentId),
  ]);
  return skills.map((s) => {
    const row = levels.get(s.id);
    return {
      skillId: s.id,
      name: s.name,
      level: row?.level ?? null,
      note: row?.note ?? null,
      weak: (row?.level ?? 0) <= WEAK_LEVEL && row?.level !== null,
    };
  });
}

/** Batch-save a student's skills. Empty level clears the row. */
export async function saveStudentSkills(
  studentId: string,
  inputs: StudentSkillInput[],
): Promise<void> {
  for (const raw of inputs) {
    const input = studentSkillInputSchema.parse(raw);
    if (input.level === null) {
      await skillRepository.removeLevel(studentId, input.skillId);
      continue;
    }
    if (!SKILL_LEVELS.includes(input.level as (typeof SKILL_LEVELS)[number])) {
      throw new Error(`level out of range (1..5)`);
    }
    await skillRepository.upsertLevel(
      studentId,
      input.skillId,
      input.level as (typeof SKILL_LEVELS)[number],
      input.note ?? null,
    );
    await logActivity({
      action: "skill.level",
      entityType: "skill",
      entityId: input.skillId,
      details: { studentId, level: input.level },
    });
  }
}
