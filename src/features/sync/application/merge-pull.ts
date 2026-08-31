import type { RowRef, SyncPayload, SyncRow, SyncTombstoneItem } from "../domain";
import { tombstoneBeatsRow } from "./tombstones";
import { updatedAt, differs } from "./sync-utils";

/**
 * Pure merge of a remote payload into local state (last-write-wins per row).
 * Produces the exact set of DB operations to apply — the caller persists them.
 */

export interface RowKey {
  tableName: string;
  rowId: string;
}

export interface PullOp {
  key: RowKey;
  row: SyncRow;
  conflict: boolean;
}

export interface PullResult {
  /** Rows to insert/update locally (remote won the timestamp race). */
  toApply: PullOp[];
  /** Rows to delete locally (a remote tombstone won). */
  toDelete: RowKey[];
  /** Remote rows kept because local is newer or identical. */
  skipped: number;
}

export interface LocalState {
  rows: RowRef[];
  tombstones: SyncTombstoneItem[];
}

export function keyOf(tableName: string, rowId: string): string {
  return `${tableName}:${rowId}`;
}

export function buildRowIndex(rows: RowRef[]): Map<string, SyncRow> {
  return new Map(rows.map((r) => [keyOf(r.tableName, r.id), r.row]));
}

export function buildTombstoneIndex(tombstones: SyncTombstoneItem[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const t of tombstones) {
    const key = keyOf(t.tableName, t.rowId);
    const current = index.get(key);
    if (current === undefined || t.deletedAt > current) index.set(key, t.deletedAt);
  }
  return index;
}

export function mergePull(remote: SyncPayload, local: LocalState): PullResult {
  const localRows = buildRowIndex(local.rows);
  const localTombstones = buildTombstoneIndex(local.tombstones);
  const remoteTombstones = buildTombstoneIndex(remote.tombstones);
  const toApply: PullOp[] = [];
  const toDelete: RowKey[] = [];
  let skipped = 0;

  for (const [tableName, rows] of Object.entries(remote.rows)) {
    for (const row of rows) {
      const id = String(row.id ?? "");
      if (!id) continue;
      const key = keyOf(tableName, id);
      const remoteTs = updatedAt(row);
      const localRow = localRows.get(key);
      const localTomb = localTombstones.get(key);
      const remoteTomb = remoteTombstones.get(key);

      if (localTomb !== undefined && tombstoneBeatsRow(localTomb, remoteTs)) {
        skipped++;
        continue;
      }
      if (remoteTomb !== undefined && tombstoneBeatsRow(remoteTomb, remoteTs)) {
        if (localRow !== undefined && tombstoneBeatsRow(remoteTomb, updatedAt(localRow))) {
          toDelete.push({ tableName, rowId: id });
        }
        continue;
      }
      if (localRow === undefined) {
        toApply.push({ key: { tableName, rowId: id }, row, conflict: false });
        continue;
      }
      if (remoteTs > updatedAt(localRow)) {
        toApply.push({ key: { tableName, rowId: id }, row, conflict: differs(row, localRow) });
        continue;
      }
      skipped++;
    }
  }

  return { toApply, toDelete, skipped };
}
