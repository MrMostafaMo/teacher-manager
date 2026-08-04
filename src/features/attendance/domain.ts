import { z } from "zod";

/**
 * Attendance domain. `present | absent | late`, one row per student per date.
 * Framework-free; the application layer validates every write through the
 * schema below.
 */

export const ATTENDANCE_STATUSES = ["present", "absent", "late"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);

export const saveAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z
    .array(
      z.object({
        studentId: z.string().min(1),
        status: attendanceStatusSchema,
      }),
    )
    .max(1000),
});

export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;
