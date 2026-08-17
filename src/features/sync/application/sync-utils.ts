import type { SyncRow } from "../domain";

/** Extract the updated_at timestamp as a number. */
export function updatedAt(row: SyncRow): number {
  return Number(row.updated_at ?? 0);
}

/** True when a row changed between local and remote (content differs). */
export function differs(a: SyncRow, b: SyncRow): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}
