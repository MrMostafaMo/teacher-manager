import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";
import { students, studyGroups, groupSessions } from "./tables-students";

/**
 * Daily attendance — one row per student per date.
 *
 * `group_id` is nullable: there is no study-groups feature yet, so attendance
 * is tracked per student. A later group feature can re-scope it.
 */
export const attendance = sqliteTable(
  "attendance",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    groupId: text("group_id").references(() => studyGroups.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    status: text("status", { enum: ["present", "absent", "late", "excused"] as const }).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("attendance_student_date").on(t.studentId, t.date),
    index("attendance_date").on(t.date),
  ],
);

/**
 * Per-session attendance — one row per student per session occurrence
 * (a recurring group session on a concrete date). Separate from the daily
 * `attendance` table so session sheets don't collide with center-wide
 * daily sheets (a student can sit two sessions in one day).
 */
export const sessionAttendance = sqliteTable(
  "session_attendance",
  {
    id: id(),
    sessionId: text("session_id")
      .notNull()
      .references(() => groupSessions.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    status: text("status", { enum: ["present", "absent", "late", "excused"] as const }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("session_attendance_session_date_student").on(t.sessionId, t.date, t.studentId),
    index("session_attendance_session_date").on(t.sessionId, t.date),
  ],
);

export type Attendance = typeof attendance.$inferSelect;
export type SessionAttendance = typeof sessionAttendance.$inferSelect;
