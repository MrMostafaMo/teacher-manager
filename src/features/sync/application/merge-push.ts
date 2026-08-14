import type { SyncPayload, SyncRow, SyncTombstoneItem } from "../domain";
import { SYNC_TABLE_NAMES } from "../domain";
import { buildTombstoneIndex, keyOf, type LocalState } from "./merge-pull";
import { tombstoneBeatsRow } from "./tombstones";

/**
 * Pure merge of local state into the remote payload (last-write-wins per row).
 * Per row id, the entity with the newest timestamp wins — a row beats a
 * tombstone on equal timestamps (undo survives). Never mutates its input.
 */

export interface PushResult {
  payload: SyncPayload;
  changed: boolean;
  pushedRows: number;
  pushedTombstones: number;
  /** Rows pushed per table name (for the sync report). */
  pushedByTable: Record<string, number>;
}

type Entity = { kind: "row"; row: SyncRow } | { kind: "tomb"; tomb: SyncTombstoneItem };

function updatedAt(row: SyncRow): number {
  return Number(row.updated_at ?? 0);
}

/** Fresh payload with empty per-table lists — deterministic output. */
function blank(remote: SyncPayload): SyncPayload {
  return {
    revision: remote.revision,
    device: remote.device,
    pushedAt: remote.pushedAt,
    schemaVersion: remote.schemaVersion,
    rows: Object.fromEntries(SYNC_TABLE_NAMES.map((name) => [name, []])),
    tombstones: [],
  };
}

/** The entity that wins a key: newest timestamp; row over tombstone on ties. */
function resolve(
  localRow: SyncRow | undefined,
  remoteRow: SyncRow | undefined,
  localTomb: number | undefined,
  remoteTomb: number | undefined,
): Entity | null {
  const candidates: Entity[] = [];
  if (localRow !== undefined && !(localTomb !== undefined && tombstoneBeatsRow(localTomb, updatedAt(localRow)))) {
    candidates.push({ kind: "row", row: localRow });
  }
  if (remoteRow !== undefined && !(remoteTomb !== undefined && tombstoneBeatsRow(remoteTomb, updatedAt(remoteRow)))) {
    candidates.push({ kind: "row", row: remoteRow });
  }
  if (localTomb !== undefined) candidates.push({ kind: "tomb", tomb: { tableName: "", rowId: "", deletedAt: localTomb } });
  if (remoteTomb !== undefined) candidates.push({ kind: "tomb", tomb: { tableName: "", rowId: "", deletedAt: remoteTomb } });
  if (candidates.length === 0) return null;
  return candidates.reduce((best, current) => {
    const ts = (e: Entity) => (e.kind === "row" ? updatedAt(e.row) : e.tomb.deletedAt);
    return ts(current) > ts(best) ? current : best;
  });
}

export function mergePush(remote: SyncPayload, local: LocalState): PushResult {
  const localRows = new Map(local.rows.map((r) => [keyOf(r.tableName, r.id), r]));
  const localTombstones = buildTombstoneIndex(local.tombstones);
  const remoteRowIndex = buildRowIndexByTable(remote);
  const remoteTombstones = buildTombstoneIndex(remote.tombstones);

  const keys = new Set<string>([
    ...localRows.keys(),
    ...remoteRowIndex.keys(),
    ...localTombstones.keys(),
    ...remoteTombstones.keys(),
  ]);

  const next = blank(remote);
  let pushedRows = 0;
  let pushedTombstones = 0;
  const pushedByTable: Record<string, number> = {};

  for (const key of [...keys].sort()) {
    const separator = key.indexOf(":");
    const tableName = key.slice(0, separator);
    const rowId = key.slice(separator + 1);
    const localRow = localRows.get(key)?.row;
    const remoteRow = remoteRowIndex.get(key);
    const localTomb = localTombstones.get(key);
    const remoteTomb = remoteTombstones.get(key);
    const entity = resolve(localRow, remoteRow, localTomb, remoteTomb);
    if (entity === null) continue;

    if (entity.kind === "row") {
      const rows = (next.rows[tableName] ??= []);
      rows.push(entity.row);
      const remoteHad = remoteRow !== undefined && !differs(entity.row, remoteRow);
      if (!remoteHad) {
        pushedRows++;
        pushedByTable[tableName] = (pushedByTable[tableName] ?? 0) + 1;
      }
    } else {
      const tomb = { tableName, rowId, deletedAt: entity.tomb.deletedAt };
      if (remoteTomb !== tomb.deletedAt) {
        next.tombstones.push(tomb);
        pushedTombstones++;
      }
    }
  }

  const changed = pushedRows > 0 || pushedTombstones > 0;
  if (changed) {
    next.revision += 1;
    next.pushedAt = Date.now();
  }
  return { payload: next, changed, pushedRows, pushedTombstones, pushedByTable };
}

/** Remote rows by `table:id` key (rows may be spread across any table). */
function buildRowIndexByTable(remote: SyncPayload): Map<string, SyncRow> {
  const index = new Map<string, SyncRow>();
  for (const [tableName, rows] of Object.entries(remote.rows)) {
    for (const row of rows) {
      index.set(keyOf(tableName, String(row.id ?? "")), row);
    }
  }
  return index;
}

function differs(a: SyncRow, b: SyncRow): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}