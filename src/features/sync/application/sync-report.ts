import type { PullResult } from "./merge-pull";
import type { PushResult } from "./merge-push";

/**
 * Per-sync outcome summary shown in the sync report dialog.
 * `error` is a localized message key (or null when the sync succeeded).
 */

export interface TableSyncCounts {
  applied: number;
  conflicts: number;
  deleted: number;
  pushed: number;
}

export interface SyncReport {
  at: number;
  tables: Record<string, TableSyncCounts>;
  pushedTombstones: number;
  conflictTotal: number;
  error: string | null;
}

export function emptyReport(at: number, error: string | null = null): SyncReport {
  return { at, tables: {}, pushedTombstones: 0, conflictTotal: 0, error };
}

/** Aggregate a pull + push round into one per-table report. */
export function buildReport(
  at: number,
  pull: PullResult | null,
  push: PushResult | null,
  error: string | null = null,
): SyncReport {
  const tables: Record<string, TableSyncCounts> = {};
  let conflictTotal = 0;

  const countsFor = (tableName: string): TableSyncCounts => {
    const counts = tables[tableName] ?? { applied: 0, conflicts: 0, deleted: 0, pushed: 0 };
    tables[tableName] = counts;
    return counts;
  };

  for (const op of pull?.toApply ?? []) {
    const counts = countsFor(op.key.tableName);
    counts.applied++;
    if (op.conflict) {
      counts.conflicts++;
      conflictTotal++;
    }
  }
  for (const key of pull?.toDelete ?? []) {
    countsFor(key.tableName).deleted++;
  }
  for (const [tableName, pushed] of Object.entries(push?.pushedByTable ?? {})) {
    countsFor(tableName).pushed += pushed;
  }

  return {
    at,
    tables,
    pushedTombstones: push?.pushedTombstones ?? 0,
    conflictTotal,
    error,
  };
}