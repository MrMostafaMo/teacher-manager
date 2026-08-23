import { z } from "zod";
import { nameSchema, optionalDate, optionalId, optionalPhone, optionalText } from "@/lib/validation";

/**
 * Student entity + input schema. Framework-free by design (no React/i18n):
 * the application layer validates every write through this schema.
 */
export const studentInputSchema = z.object({
  name: nameSchema,
  phone: optionalPhone,
  guardianName: optionalText(100),
  guardianPhone: optionalPhone,
  status: z.enum(["active", "inactive"]),
  planId: optionalId,
  notes: optionalText(2000),
  enrolledOn: optionalDate,
  birthDate: optionalDate,
  gradeLevel: optionalText(50),
  photoUrl: optionalText(500),
});

export type StudentInput = z.infer<typeof studentInputSchema>;
