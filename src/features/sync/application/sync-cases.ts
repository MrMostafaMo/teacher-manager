/**
 * Sync orchestration: pull (merge into local), push (merge up to Drive),
 * with If-Match optimistic locking and up to 3 attempts on conflict.
 */

import { queryFirst } from "@/lib/db/client";
import { uuid } from "@/lib/utils/uuid";
import { mergePull, type LocalState } from "./merge-pull";
import { mergePush } from "./merge-push";
import { buildReport, emptyReport, type SyncReport } from "./sync-report";
import { buildDriveSession } from "./sync-session";
import type { SyncPayload } from "../domain";
import { SYNC_TABLE_NAMES } from "../domain";
import { DriveClient, DriveError } from "../infrastructure/drive-client";
import {
  applyPullResult,
  buildLocalSnapshot,
  parsePayload,
  serializePayload,
} from "../infrastructure/sync-snapshot";
import {
  SYNC_META_KEYS,
  getSyncMeta,
  listLocalTombstones,
  setSyncMeta,
} from "../infrastructure/sync-state-repo";

const PAYLOAD_FILE = "sync-data.json";
const MAX_ATTEMPTS = 3;

let busy = false;

export function isSyncBusy(): boolean {
  return busy;
}

async function localSchemaVersion(): Promise<number> {
  const row = await queryFirst<{ v: number | null }>(
    "SELECT MAX(version) AS v FROM _sqlx_migrations",
    [],
  );
  return row?.v ?? 0;
}

export async function deviceName(): Promise<string> {
  const existing = await getSyncMeta(SYNC_META_KEYS.deviceId);
  if (existing !== null) return `device-${existing.slice(0, 8)}`;
  const id = uuid();
  await setSyncMeta(SYNC_META_KEYS.deviceId, id);
  return `device-${id.slice(0, 8)}`;
}

/** Pull-merge-push with optimistic locking; returns the outcome report. */
export async function syncNow(reason?: string): Promise<SyncReport> {
  void reason;
  if (busy) return emptyReport(Date.now(), "sync.errors.busy");
  busy = true;
  try {
    const schemaVersion = await localSchemaVersion();
    const session = await buildDriveSession();
    const client = new DriveClient(session);
    return runRound(client, schemaVersion);
  } catch (error) {
    return emptyReport(Date.now(), errorKey(error));
  } finally {
    busy = false;
  }
}

function errorKey(error: unknown): string {
  if (!(error instanceof DriveError)) return "sync.errors.unknown";
  switch (error.kind) {
    case "unauthorized":
      return "sync.errors.notConnected";
    case "conflict":
      return "sync.errors.conflict";
    case "network":
      return "sync.errors.network";
    default:
      return "sync.errors.unknown";
  }
}

async function runRound(client: DriveClient, schemaVersion: number): Promise<SyncReport> {
  const device = await deviceName();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const remote = await client.download(PAYLOAD_FILE);
    let remotePayload: SyncPayload | null = null;
    if (remote !== null) {
      try {
        remotePayload = parsePayload(remote.text);
      } catch {
        return emptyReport(Date.now(), "sync.errors.invalidRemote");
      }
      if (remotePayload.schemaVersion !== schemaVersion) {
        return emptyReport(Date.now(), "sync.errors.versionMismatch");
      }
    }

    const base: SyncPayload = remotePayload ?? emptyPayload(device, schemaVersion);
    const before: LocalState = {
      rows: await buildLocalSnapshot(),
      tombstones: await listLocalTombstones(),
    };
    const pull = remotePayload !== null ? mergePull(remotePayload, before) : null;
    if (pull !== null) await applyPullResult(pull);

    const after: LocalState = {
      rows: await buildLocalSnapshot(),
      tombstones: await listLocalTombstones(),
    };
    const push = mergePush(base, after);

    if (!push.changed) {
      await persistState(push.payload.revision);
      return buildReport(Date.now(), pull, push);
    }
    try {
      await client.upload(PAYLOAD_FILE, serializePayload(push.payload), remote?.etag ?? null);
      await persistState(push.payload.revision);
      return buildReport(Date.now(), pull, push);
    } catch (error) {
      const isConflict = error instanceof DriveError && error.kind === "conflict";
      if (isConflict && attempt < MAX_ATTEMPTS - 1) continue;
      throw error;
    }
  }
  return emptyReport(Date.now(), "sync.errors.conflict");
}

async function persistState(revision: number): Promise<void> {
  await setSyncMeta(SYNC_META_KEYS.lastRevision, revision);
  await setSyncMeta(SYNC_META_KEYS.lastSyncAt, Date.now());
}

function emptyPayload(device: string, schemaVersion: number): SyncPayload {
  return {
    revision: 0,
    device,
    pushedAt: 0,
    schemaVersion,
    rows: Object.fromEntries(SYNC_TABLE_NAMES.map((name) => [name, []])),
    tombstones: [],
  };
}
