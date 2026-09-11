import { z } from "zod";

/** "HH:mm" 24-hour clock. */
export const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "YYYY-MM-DD" calendar date key. */
export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

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

/** Cancel one occurrence of a weekly session on a given date. */
export const cancelSessionSchema = z.object({
  sessionId: z.string().min(1),
  date: z.string().regex(dateRegex, "invalid date"),
});

/** Move one occurrence of a weekly session to a new time/room on the same date. */
export const moveSessionSchema = z
  .object({
    sessionId: z.string().min(1),
    date: z.string().regex(dateRegex, "invalid date"),
    startTime: z.string().regex(timeRegex, "invalid time"),
    endTime: z.string().regex(timeRegex, "invalid time"),
    room: z.string().trim().max(100).optional(),
  })
  .refine((s) => s.endTime > s.startTime, {
    path: ["endTime"],
    message: "end after start",
  });

const timeRange = {
  startTime: z.string().regex(timeRegex, "invalid time"),
  endTime: z.string().regex(timeRegex, "invalid time"),
};

/** Extra session of a group that fires on `date` only (never weekly). */
export const oneOffSessionInputSchema = z
  .object({
    groupId: z.string().min(1),
    date: z.string().regex(dateRegex, "invalid date"),
    ...timeRange,
    room: z.string().trim().max(100).optional(),
  })
  .refine((s) => s.endTime > s.startTime, {
    path: ["endTime"],
    message: "end after start",
  });

export type OneOffSessionInput = z.infer<typeof oneOffSessionInputSchema>;

/**
 * Move one occurrence to another date (e.g. Sunday → Monday for one week
 * only). Same-weekday targets behave like a same-date move; anything else
 * cancels the source occurrence and creates a linked one-off session.
 */
export const moveAcrossDaysSchema = z
  .object({
    sessionId: z.string().min(1),
    date: z.string().regex(dateRegex, "invalid date"),
    targetDate: z.string().regex(dateRegex, "invalid date"),
    ...timeRange,
    room: z.string().trim().max(100).optional(),
  })
  .refine((s) => s.endTime > s.startTime, {
    path: ["endTime"],
    message: "end after start",
  })
  .refine((s) => s.targetDate !== s.date, {
    path: ["targetDate"],
    message: "different date",
  });

export type MoveAcrossDaysInput = z.infer<typeof moveAcrossDaysSchema>;

/** Weekday keys indexed by `Date#getDay()` (0=Sunday … 6=Saturday). */
export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
