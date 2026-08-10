import { z } from "zod";
import { nameSchema, optionalDate, optionalId, optionalText } from "@/lib/validation";

/**
 * Student entity + input schema. Framework-free by design (no React/i18n):
 * the application layer validates every write through this schema.
 */
export const studentInputSchema = z.object({
  name: nameSchema,
  phone: optionalText(20),
  guardianName: optionalText(100),
  guardianPhone: optionalText(20),
  status: z.enum(["active", "inactive"]),
  planId: optionalId,
  notes: optionalText(2000),
  enrolledOn: optionalDate,
});

export type StudentInput = z.infer<typeof studentInputSchema>;
