import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";
import { students, studyGroups } from "./tables-students";

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

export type Homework = typeof homeworks.$inferSelect;
export type HomeworkSubmission = typeof homeworkSubmissions.$inferSelect;
