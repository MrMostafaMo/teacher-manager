import { z } from "zod";

/**
 * Student entity + input schema. Framework-free by design (no React/i18n):
 * the application layer validates every write through this schema.
 *
 * `optionalText` normalizes empty strings to `undefined` so the DB stores
 * NULL rather than "" for blank optional fields.
 */
const optionalText = (max: number) =>
  z
    .union([z.literal(""), z.string().trim().pipe(z.string().max(max))])
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalId = z
  .union([z.literal(""), z.string().min(1)])
  .optional()
  .transform((v) => (v ? v : undefined));

export const studentInputSchema = z.object({
  name: z.string().trim().pipe(z.string().min(1).max(100)),
  phone: optionalText(20),
  guardianName: optionalText(100),
  guardianPhone: optionalText(20),
  status: z.enum(["active", "inactive"]),
  planId: optionalId,
  notes: optionalText(2000),
});

export type StudentInput = z.infer<typeof studentInputSchema>;
