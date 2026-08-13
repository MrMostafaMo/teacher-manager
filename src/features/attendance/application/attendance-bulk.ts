import type { AttendanceStatus } from "@/features/attendance/domain";

/** Per-student draft status map (studentId → status; missing = unmarked). */
export type StatusDraft = Record<string, AttendanceStatus | undefined>;

/**
 * Bulk-roster helpers for the daily attendance sheet. Pure functions — the
 * UI owns the draft state; these only compute the next draft shape.
 */

/** Copy `draft` with every listed student set to present (existing rows kept). */
export function markAllPresent(
  draft: StatusDraft,
  students: ReadonlyArray<{ id: string }>,
): StatusDraft {
  const next: StatusDraft = { ...draft };
  for (const s of students) next[s.id] = "present";
  return next;
}

/** True when any listed student's draft differs from the last saved status. */
export function isDirty(
  draft: StatusDraft,
  saved: StatusDraft,
  students: ReadonlyArray<{ id: string }>,
): boolean {
  return students.some((s) => draft[s.id] !== saved[s.id]);
}