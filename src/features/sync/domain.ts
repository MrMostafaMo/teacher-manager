import { z } from "zod";
import { attendance, sessionAttendance } from "@/lib/db/tables-attendance";
import { plans } from "@/lib/db/tables-core";
import { expenses, payments } from "@/lib/db/tables-payments";
import { examResults, exams } from "@/lib/db/tables-exams";
import { homeworkSubmissions, homeworks } from "@/lib/db/tables-homework";
import { skills, studentSkills } from "@/lib/db/tables-skills";
import {
  groupSessions,
  sessionExceptions,
  studentGroups,
  students,
  studyGroups,
} from "@/lib/db/tables-students";
import { weakPoints } from "@/lib/db/tables-weak-points";

/**
 * Tables that participate in two-way sync. Local noise (activity_logs,
 * notifications, app_meta, sync_* itself) stays out by design. Names must
 * match the DELETE trigger literals in migration v15.
 */
export const SYNC_TABLES = [
  students,
  studyGroups,
  studentGroups,
  groupSessions,
  sessionExceptions,
  attendance,
  sessionAttendance,
  plans,
  payments,
  expenses,
  homeworks,
  homeworkSubmissions,
  exams,
  examResults,
  skills,
  studentSkills,
  weakPoints,
] as const;

export const SYNC_TABLE_NAMES: readonly string[] = [
  "students",
  "study_groups",
  "student_groups",
  "group_sessions",
  "session_exceptions",
  "attendance",
  "session_attendance",
  "plans",
  "payments",
  "expenses",
  "homeworks",
  "homework_submissions",
  "exams",
  "exam_results",
  "skills",
  "student_skills",
  "weak_points",
] as const;

/** A row serialized for transport — every column is text/integer/null. */
export type SyncRow = Record<string, string | number | null>;

/** One local row with the table it belongs to. */
export interface RowRef {
  tableName: string;
  id: string;
  row: SyncRow;
}

/** Delete marker that outranks a live row only when newer (see tombstones.ts). */
export interface SyncTombstoneItem {
  tableName: string;
  rowId: string;
  deletedAt: number;
}

/** The shared remote file: rows + tombstones + revision + schema guard. */
export interface SyncPayload {
  revision: number;
  device: string;
  pushedAt: number;
  schemaVersion: number;
  rows: Record<string, SyncRow[]>;
  tombstones: SyncTombstoneItem[];
}

export const syncRowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

export const syncTombstoneSchema = z.object({
  tableName: z.string(),
  rowId: z.string(),
  deletedAt: z.number().int(),
});

export const syncPayloadSchema = z.object({
  revision: z.number().int().min(0),
  device: z.string(),
  pushedAt: z.number().int(),
  schemaVersion: z.number().int().min(1),
  rows: z.record(z.string(), z.array(syncRowSchema)),
  tombstones: z.array(syncTombstoneSchema),
});

export type SyncPayloadInput = z.infer<typeof syncPayloadSchema>;

const DRIZZLE_NAME = Symbol.for("drizzle:Name");

/** SQL table name of a drizzle table object (Symbol.for("drizzle:Name")). */
export function tableNameOf(table: object): string {
  return (table as Record<symbol, string>)[DRIZZLE_NAME];
}
