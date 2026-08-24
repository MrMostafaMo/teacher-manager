import { z } from "zod";
import { nameSchema, optionalText } from "@/lib/validation";

/**
 * Study group entity + input schema. `optionalText` normalizes blank inputs
 * to `undefined` so the DB stores NULL instead of "" for empty optional
 * fields.
 */
export const studyGroupInputSchema = z
  .object({
    name: nameSchema,
    subject: optionalText(100),
    startsOn: optionalText(10),
    maxStudents: z.number().int().positive().optional().nullable(),
    sessionsPerCycle: z.number().int().min(1).max(30).optional().nullable(),
    warningAt: z.number().int().min(1).max(30).optional().nullable(),
    status: z.enum(["active", "inactive"]),
    notes: optionalText(2000),
  })
  .refine((v) => v.warningAt == null || v.sessionsPerCycle == null || v.warningAt < v.sessionsPerCycle, {
    path: ["warningAt"],
    message: "warning must be less than sessions",
  });

export type StudyGroupInput = z.infer<typeof studyGroupInputSchema>;
