import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "./columns";

/** Singleton teacher profile — id always "default", synced across devices. */
export const teacherProfile = sqliteTable("teacher_profile", {
  id: id(),
  name: text("name").notNull(),
  ...timestamps,
});

export type TeacherProfile = typeof teacherProfile.$inferSelect;
