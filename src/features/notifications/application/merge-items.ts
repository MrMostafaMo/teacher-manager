import type { NotificationItem } from "@/features/notifications/domain";

export interface MergeResult {
  toInsert: NotificationItem[];
  /** Stored row ids whose key is no longer desired (resolved conditions). */
  toRemove: string[];
}

/** Diff the desired set against the stored rows by dedup key. */
export function mergeItems(
  existing: Array<{ id: string; key: string }>,
  desired: NotificationItem[],
): MergeResult {
  const existingByKey = new Map(existing.map((e) => [e.key, e.id]));
  const desiredKeys = new Set(desired.map((d) => d.key));
  const toInsert = desired.filter((d) => !existingByKey.has(d.key));
  const toRemove = existing.filter((e) => !desiredKeys.has(e.key)).map((e) => e.id);
  return { toInsert, toRemove };
}
