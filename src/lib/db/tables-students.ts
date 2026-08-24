import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";
import { plans } from "./tables-core";

const activeStatus = { enum: ["active", "inactive"] as const };

/** Students of the center. Guardian contact lives here (no parents table yet). */
export const students = sqliteTable(
  "students",
  {
    id: id(),
    name: text("name").notNull(),
    phone: text("phone"),
    guardianName: text("guardian_name"),
    guardianPhone: text("guardian_phone"),
    status: text("status", activeStatus).notNull().default("active"),
    notes: text("notes"),
    planId: text("plan_id").references(() => plans.id, { onDelete: "set null" }),
    /** First date ("YYYY-MM-DD") the student attends; NULL = no bound (legacy). */
    enrolledOn: text("enrolled_on"),
    /** Date of birth ("YYYY-MM-DD"), nullable. */
    birthDate: text("birth_date"),
    /** Free-text grade/level, nullable. */
    gradeLevel: text("grade_level"),
    /** Local file path to a student photo, nullable. */
    photoUrl: text("photo_url"),
    /** Exempt from all payment dues (relatives, scholarships, etc.). */
    isExempt: integer("is_exempt", { mode: "boolean" }).notNull().default(false),
    exemptReason: text("exempt_reason", {
      enum: ["relative", "scholarship", "other"] as const,
    }),
    exemptNote: text("exempt_note"),
    ...timestamps,
  },
  (t) => [index("students_name").on(t.name)],
);

/** Class groups a student belongs to. */
export const studyGroups = sqliteTable("study_groups", {
  id: id(),
  name: text("name").notNull(),
  subject: text("subject"),
  /** First date ("YYYY-MM-DD") the group's weekly sessions take effect; NULL = no bound. */
  startsOn: text("starts_on"),
  /** Maximum number of students allowed; NULL = unlimited. */
  maxStudents: integer("max_students"),
  /** Sessions per billing cycle for this group; NULL = inherit global default. */
  sessionsPerCycle: integer("sessions_per_cycle"),
  /** Warning threshold for this group; NULL = sessionsPerCycle - 2. */
  warningAt: integer("warning_at"),
  status: text("status", activeStatus).notNull().default("active"),
  notes: text("notes"),
  ...timestamps,
});

/** Many-to-many membership between students and study groups. */
export const studentGroups = sqliteTable(
  "student_groups",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => studyGroups.id, { onDelete: "cascade" }),
    /** When the student was added to this group (unix-ms). */
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("student_groups_student_group").on(t.studentId, t.groupId),
    index("student_groups_group").on(t.groupId),
  ],
);

/**
 * Recurring weekly sessions of a study group (the weekly timetable).
 * `dayOfWeek` follows JS `Date#getDay()`: 0=Sunday … 6=Saturday.
 * `startTime`/`endTime` are "HH:mm" strings.
 */
export const groupSessions = sqliteTable(
  "group_sessions",
  {
    id: id(),
    groupId: text("group_id")
      .notNull()
      .references(() => studyGroups.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    room: text("room"),
    ...timestamps,
  },
  (t) => [
    index("group_sessions_group").on(t.groupId),
    uniqueIndex("group_sessions_group_day_start").on(t.groupId, t.dayOfWeek, t.startTime),
  ],
);

/**
 * One-off exceptions to a recurring session occurrence (the weekly timetable).
 * `type` is "cancelled" or "moved"; `startTime`/`endTime`/`room` are only set
 * for moved occurrences. `date` is "YYYY-MM-DD"; at most one row per
 * (session, date).
 */
export const sessionExceptions = sqliteTable(
  "session_exceptions",
  {
    id: id(),
    sessionId: text("session_id")
      .notNull()
      .references(() => groupSessions.id),
    date: text("date").notNull(),
    type: text("type", { enum: ["cancelled", "moved"] }).notNull(),
    startTime: text("start_time"),
    endTime: text("end_time"),
    room: text("room"),
    ...timestamps,
  },
  (t) => [
    index("session_exceptions_session").on(t.sessionId),
    uniqueIndex("session_exceptions_session_date").on(t.sessionId, t.date),
  ],
);

export type Student = typeof students.$inferSelect;
export type StudyGroup = typeof studyGroups.$inferSelect;
export type GroupSession = typeof groupSessions.$inferSelect;
export type SessionException = typeof sessionExceptions.$inferSelect;
