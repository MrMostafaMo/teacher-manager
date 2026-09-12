import { eq } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { db, queryAll, queryFirst } from "@/lib/db/client";

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
  /** table → its missing columns (only checked tables appear here). */
  missingColumns: Record<string, string[]>;
  /** "ok", or the raw PRAGMA output / error text. */
  integrity: string;
}

/** Full column set of group_sessions (drizzle order) — v25 added the last three. */
export const EXPECTED_COLUMNS: Record<string, string[]> = {
  group_sessions: [
    "id",
    "group_id",
    "day_of_week",
    "start_time",
    "end_time",
    "room",
    "one_off_date",
    "moved_from_session_id",
    "moved_from_date",
    "created_at",
    "updated_at",
  ],
};

/** Table names actually present in the live file. */
export async function listTables(): Promise<string[]> {
  const rows = await db
    .select({ name: sqliteMaster.name })
    .from(sqliteMaster)
    .where(eq(sqliteMaster.type, "table"));
  return rows.map((r) => r.name).filter((n): n is string => typeof n === "string");
}

/** Column names of one table (empty when the table itself is missing). */
export async function listColumns(table: string): Promise<string[]> {
  const rows = await queryAll<{ name: unknown }>(`PRAGMA table_info("${table}")`);
  return rows.map((r) => r.name).filter((n): n is string => typeof n === "string");
}

/**
 * Boot-time health check: every expected table present, checked tables have
 * all their columns, plus a quick consistency pass. Never throws — callers
 * branch on `ok`.
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
    const missingColumns: Record<string, string[]> = {};
    for (const [table, expected] of Object.entries(EXPECTED_COLUMNS)) {
      if (!present.has(table)) continue;
      const actual = new Set(await listColumns(table));
      const missing = expected.filter((c) => !actual.has(c));
      if (missing.length > 0) missingColumns[table] = missing;
    }
    const values = Object.values(check ?? {});
    const integrity = values.length === 1 && values[0] === "ok" ? "ok" : JSON.stringify(check);
    const ok =
      missingTables.length === 0 &&
      Object.keys(missingColumns).length === 0 &&
      integrity === "ok";
    return { ok, missingTables, missingColumns, integrity };
  } catch (e: unknown) {
    return {
      ok: false,
      missingTables: [],
      missingColumns: {},
      integrity: e instanceof Error ? e.message : String(e),
    };
  }
}
