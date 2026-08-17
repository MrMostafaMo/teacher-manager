import { z } from "zod";
import { textSchema } from "@/lib/validation";

/**
 * Weak-points input schema. `description` is the specific point of weakness
 * (free text); `recordedOn` is unix-ms from the date picker; `resolved` marks
 * the point as addressed.
 */
export const weakPointInputSchema = z.object({
  description: textSchema(200),
  recordedOn: z.number().int().positive(),
  resolved: z.boolean(),
});

export type WeakPointInput = z.infer<typeof weakPointInputSchema>;
