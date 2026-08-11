import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";
import { students } from "./tables-students";

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

export type Skill = typeof skills.$inferSelect;
export type StudentSkill = typeof studentSkills.$inferSelect;
