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
    ...timestamps,
  },
  (t) => [index("students_name").on(t.name)],
);

/** Class groups a student belongs to. */
export const studyGroups = sqliteTable("study_groups", {
  id: id(),
  name: text("name").notNull(),
  subject: text("subject"),
  schedule: text("schedule"),
  /** First date ("YYYY-MM-DD") the group's weekly sessions take effect; NULL = no bound. */
  startsOn: text("starts_on"),
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

export type Student = typeof students.$inferSelect;
export type StudyGroup = typeof studyGroups.$inferSelect;
export type GroupSession = typeof groupSessions.$inferSelect;
