import { z } from "zod";
import { nameSchema, optionalText } from "@/lib/validation";

/**
 * Study group entity + input schema. `optionalText` normalizes blank inputs
 * to `undefined` so the DB stores NULL instead of "" for empty optional
 * fields.
 */
export const studyGroupInputSchema = z.object({
  name: nameSchema,
  subject: optionalText(100),
  schedule: optionalText(100),
  startsOn: optionalText(10),
  status: z.enum(["active", "inactive"]),
  notes: optionalText(2000),
});

export type StudyGroupInput = z.infer<typeof studyGroupInputSchema>;
