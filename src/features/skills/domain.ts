import { z } from "zod";
import { nameSchema, optionalText } from "@/lib/validation";

/**
 * Skills catalog + per-student mastery. `level` is 1-5; 1-2 counts as a weak
 * point. A student without a `student_skills` row simply has the skill unset.
 */

export const skillInputSchema = z.object({
  name: nameSchema,
});

export type SkillInput = z.infer<typeof skillInputSchema>;

export const SKILL_LEVELS = [1, 2, 3, 4, 5] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/** Weak threshold — skills at this level or below are flagged as weak. */
export const WEAK_LEVEL = 2;

/** Raw form shape for one student's skill row. Empty level clears the row. */
export const studentSkillInputSchema = z.object({
  skillId: z.string().min(1),
  level: z
    .union([z.literal(""), z.number(), z.string()])
    .transform((v) => (v === "" ? null : Number(v))),
  note: optionalText(500),
});

export type StudentSkillInput = z.input<typeof studentSkillInputSchema>;
