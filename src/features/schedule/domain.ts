import { z } from "zod";

/** "HH:mm" 24-hour clock. */
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Weekly session of a study group. `dayOfWeek` mirrors `Date#getDay()`
 * (0=Sunday … 6=Saturday); times are "HH:mm" strings.
 */
export const groupSessionInputSchema = z
  .object({
    groupId: z.string().min(1),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, "invalid time"),
    endTime: z.string().regex(timeRegex, "invalid time"),
    room: z.string().trim().max(100).optional(),
  })
  .refine((s) => s.endTime > s.startTime, {
    path: ["endTime"],
    message: "end after start",
  });

export type GroupSessionInput = z.infer<typeof groupSessionInputSchema>;
