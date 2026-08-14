/**
 * Database schema — the single source of truth for the SQLite layout.
 * Tables are grouped in feature files below; this barrel keeps every
 * `@/lib/db/schema` import working unchanged.
 */
export { id, timestamps } from "./columns";
export * from "./tables-core";
export * from "./tables-students";
export * from "./tables-attendance";
export * from "./tables-payments";
export * from "./tables-homework";
export * from "./tables-exams";
export * from "./tables-skills";
export * from "./tables-activity";
export { notifications } from "./tables-notifications";
export * from "./tables-weak-points";
export type { NotificationRow } from "./tables-notifications";
