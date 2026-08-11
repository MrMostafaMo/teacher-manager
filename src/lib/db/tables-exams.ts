import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";
import { students, studyGroups } from "./tables-students";

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

export type Exam = typeof exams.$inferSelect;
export type ExamResult = typeof examResults.$inferSelect;
