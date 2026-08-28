import type { SyncRow } from "../domain";

/** Extract the updated_at timestamp as a number. */
export function updatedAt(row: SyncRow): number {
  return Number(row.updated_at ?? 0);
}

/** True when a row changed between local and remote (content differs). */
export function differs(a: SyncRow, b: SyncRow): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return true;
  for (let i = 0; i < ka.length; i++) {
    const k = ka[i];
    if (k !== kb[i]) return true;
    if (a[k] !== b[k]) return true;
  }
  return false;
}
