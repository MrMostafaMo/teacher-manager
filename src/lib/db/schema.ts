import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Shared column builders used by every table.
 * - `id`: UUID primary key (v4 strings generated in the application layer)
 * - `timestamps`: created_at / updated_at as unix epoch milliseconds
 *   (the SQL plugin's prepared statements cannot use SQLite CURRENT_TIMESTAMP,
 *   so repositories set these explicitly — this keeps them correct on every write).
 */
export const id = () => text("id").primaryKey();

export const timestamps = {
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
} as const;

const activeStatus = { enum: ["active", "inactive"] as const };

/** Key/value metadata table. Stores schema version and app-level flags. */
export const appMeta = sqliteTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  ...timestamps,
});

/** Subscription plans (e.g. monthly, term). Amount in EGP as integer. */
export const plans = sqliteTable("plans", {
  id: id(),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  billingInterval: text("billing_interval", {
    enum: ["monthly", "term", "yearly"] as const,
  })
    .notNull()
    .default("monthly"),
  ...timestamps,
});

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
    status: text("status", { enum: ["present", "absent", "late"] as const }).notNull(),
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
    status: text("status", { enum: ["present", "absent", "late"] as const }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("session_attendance_session_date_student").on(t.sessionId, t.date, t.studentId),
    index("session_attendance_session_date").on(t.sessionId, t.date),
  ],
);

/** Payment records. `period` is the billed ISO month (YYYY-MM), when applicable. */
export const payments = sqliteTable(
  "payments",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    planId: text("plan_id").references(() => plans.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(),
    period: text("period"),
    method: text("method", { enum: ["cash", "card", "transfer"] as const })
      .notNull()
      .default("cash"),
    note: text("note"),
    paidAt: integer("paid_at").notNull(),
    ...timestamps,
  },
  (t) => [
    index("payments_student").on(t.studentId),
    index("payments_paid_at").on(t.paidAt),
  ],
);

/** Outgoing costs (prizes, stationery, utilities…) — money spent by the center. */
export const expenseCategories = [
  "prizes",
  "stationery",
  "utilities",
  "maintenance",
  "other",
] as const;

export const expenses = sqliteTable(
  "expenses",
  {
    id: id(),
    title: text("title").notNull(),
    category: text("category", { enum: expenseCategories }).notNull(),
    amount: integer("amount").notNull(),
    note: text("note"),
    spentAt: integer("spent_at").notNull(),
    ...timestamps,
  },
  (t) => [index("expenses_spent_at").on(t.spentAt)],
);

/** Homework assignments, scoped to a study group. */
export const homeworks = sqliteTable(
  "homeworks",
  {
    id: id(),
    groupId: text("group_id")
      .notNull()
      .references(() => studyGroups.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: text("due_date"),
    ...timestamps,
  },
  (t) => [index("homeworks_group").on(t.groupId)],
);

/** Per-student completion state of a homework assignment. */
export const homeworkSubmissions = sqliteTable(
  "homework_submissions",
  {
    id: id(),
    homeworkId: text("homework_id")
      .notNull()
      .references(() => homeworks.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["submitted", "pending", "late"] as const })
      .notNull()
      .default("pending"),
    submittedAt: integer("submitted_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("homework_submissions_homework_student").on(t.homeworkId, t.studentId),
    index("homework_submissions_student").on(t.studentId),
  ],
);

/** Exam definitions, scoped to a study group. */
export const exams = sqliteTable(
  "exams",
  {
    id: id(),
    groupId: text("group_id")
      .notNull()
      .references(() => studyGroups.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    date: text("date"),
    maxScore: integer("max_score").notNull().default(100),
    ...timestamps,
  },
  (t) => [index("exams_group").on(t.groupId)],
);

/** A student's grade in an exam. */
export const examResults = sqliteTable(
  "exam_results",
  {
    id: id(),
    examId: text("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("exam_results_exam_student").on(t.examId, t.studentId),
    index("exam_results_student").on(t.studentId),
  ],
);

/** Skills catalog (e.g. "multiplication tables", "reading comprehension"). */
export const skills = sqliteTable("skills", {
  id: id(),
  name: text("name").notNull(),
  ...timestamps,
});

/** Per-student skill mastery / weak points. `level` is 1-5. */
export const studentSkills = sqliteTable(
  "student_skills",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: integer("level"),
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("student_skills_student_skill").on(t.studentId, t.skillId),
    index("student_skills_skill").on(t.skillId),
  ],
);

/**
 * Audit trail for every mutation. `details` is a JSON string; the activity
 * log service (`src/lib/activity-log.ts`) is the only writer.
 */
export const activityLogs = sqliteTable(
  "activity_logs",
  {
    id: id(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    details: text("details"),
    ...timestamps,
  },
  (t) => [
    index("activity_logs_created").on(t.createdAt),
    index("activity_logs_entity").on(t.entityType, t.entityId),
  ],
);

export type AppMeta = typeof appMeta.$inferSelect;
export type AppMetaInsert = typeof appMeta.$inferInsert;
export type Student = typeof students.$inferSelect;
export type StudyGroup = typeof studyGroups.$inferSelect;
export type GroupSession = typeof groupSessions.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type SessionAttendance = typeof sessionAttendance.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Homework = typeof homeworks.$inferSelect;
export type HomeworkSubmission = typeof homeworkSubmissions.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type ExamResult = typeof examResults.$inferSelect;
export type Skill = typeof skills.$inferSelect;
export type StudentSkill = typeof studentSkills.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
