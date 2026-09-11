import type { NotificationItem } from "@/features/notifications/domain";

export interface MergeResult {
  toInsert: NotificationItem[];
  /** Stored row ids whose key is no longer desired (resolved conditions). */
  toRemove: string[];
  /** Stored rows whose details changed (stale amounts refresh in place). */
  toUpdate: Array<{ id: string; details: NotificationItem["details"] }>;
}

function sameDetails(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

/** Diff the desired set against the stored rows by dedup key. */
export function mergeItems(
  existing: Array<{ id: string; key: string; details?: unknown }>,
  desired: NotificationItem[],
): MergeResult {
  const existingByKey = new Map(existing.map((e) => [e.key, e]));
  const desiredKeys = new Set(desired.map((d) => d.key));
  const toInsert = desired.filter((d) => !existingByKey.has(d.key));
  const toRemove = existing.filter((e) => !desiredKeys.has(e.key)).map((e) => e.id);
  const toUpdate: MergeResult["toUpdate"] = [];
  for (const d of desired) {
    const row = existingByKey.get(d.key);
    if (!row || row.details === undefined) continue;
    let stored: unknown = row.details;
    if (typeof stored === "string") {
      try {
        stored = JSON.parse(stored);
      } catch {
        continue;
      }
    }
    if (!sameDetails(stored, d.details)) toUpdate.push({ id: row.id, details: d.details });
  }
  return { toInsert, toRemove, toUpdate };
}
