import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";
import { students } from "./tables-students";

/** Per-student points of weakness (free text) with a recorded date and resolved flag. */
export const weakPoints = sqliteTable(
  "weak_points",
  {
    id: id(),
    studentId: text("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    recordedOn: integer("recorded_on").notNull(),
    resolved: integer("resolved").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("weak_points_student").on(t.studentId)],
);

export type WeakPoint = typeof weakPoints.$inferSelect;
