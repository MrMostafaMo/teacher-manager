import { z } from "zod";

/**
 * Study group entity + input schema. Mirrors the students schema:
 * `optionalText` normalizes blank inputs to `undefined` so the DB stores
 * NULL instead of "" for empty optional fields.
 */
const optionalText = (max: number) =>
  z
    .union([z.literal(""), z.string().trim().pipe(z.string().max(max))])
    .optional()
    .transform((v) => (v ? v : undefined));

export const studyGroupInputSchema = z.object({
  name: z.string().trim().pipe(z.string().min(1).max(100)),
  subject: optionalText(100),
  schedule: optionalText(100),
  status: z.enum(["active", "inactive"]),
  notes: optionalText(2000),
});

export type StudyGroupInput = z.infer<typeof studyGroupInputSchema>;
