import { eq } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { db, queryFirst } from "@/lib/db/client";

const sqliteMaster = sqliteTable("sqlite_master", {
  type: text("type"),
  name: text("name"),
});

/** Every table the app reads or writes (migrations create them all). */
export const EXPECTED_TABLES = [
  "activity_logs",
  "app_meta",
  "attendance",
  "exam_results",
  "exams",
  "expenses",
  "group_sessions",
  "homework_submissions",
  "homeworks",
  "notifications",
  "payments",
  "plan_price_history",
  "plans",
  "session_attendance",
  "session_exceptions",
  "skills",
  "student_groups",
  "student_skills",
  "students",
  "study_groups",
  "sync_meta",
  "sync_tombstones",
  "teacher_profile",
  "weak_points",
];

export interface SchemaReport {
  ok: boolean;
  missingTables: string[];
  /** "ok", or the raw PRAGMA output / error text. */
  integrity: string;
}

/** Table names actually present in the live file. */
export async function listTables(): Promise<string[]> {
  const rows = await db
    .select({ name: sqliteMaster.name })
    .from(sqliteMaster)
    .where(eq(sqliteMaster.type, "table"));
  return rows.map((r) => r.name).filter((n): n is string => typeof n === "string");
}

/**
 * Boot-time health check: every expected table present + a quick
 * consistency pass. Never throws — callers branch on `ok`.
 */
export async function verifySchema(): Promise<SchemaReport> {
  try {
    const [tables, check] = await Promise.all([
      listTables(),
      queryFirst<Record<string, unknown>>("PRAGMA quick_check").catch((e: unknown) => ({
        error: e instanceof Error ? e.message : String(e),
      })),
    ]);
    const present = new Set(tables);
    const missingTables = EXPECTED_TABLES.filter((t) => !present.has(t));
    const values = Object.values(check ?? {});
    const integrity = values.length === 1 && values[0] === "ok" ? "ok" : JSON.stringify(check);
    return { ok: missingTables.length === 0 && integrity === "ok", missingTables, integrity };
  } catch (e: unknown) {
    return {
      ok: false,
      missingTables: [],
      integrity: e instanceof Error ? e.message : String(e),
    };
  }
}
