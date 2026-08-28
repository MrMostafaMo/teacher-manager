import { queryFirst } from "@/lib/db/client";
import { uuid } from "@/lib/utils/uuid";
import { mergePull, type LocalState } from "./merge-pull";
import { mergePush } from "./merge-push";
import { buildReport, emptyReport, type SyncReport } from "./sync-report";
import { SupabaseError } from "../infrastructure/supabase-http";
import type { SyncProvider } from "../domain/sync-provider";
import { SupabaseProvider } from "../infrastructure/supabase-provider";
import type { SyncPayload } from "../domain";
import { SYNC_TABLE_NAMES } from "../domain";
import { applyPullResult, buildLocalSnapshot, parsePayload, serializePayload } from "../infrastructure/sync-snapshot";
import { SYNC_META_KEYS, getSyncMeta, listLocalTombstones, setSyncMeta } from "../infrastructure/sync-state-repo";

const MAX_ATTEMPTS = 3;

let busy = false;

export function isSyncBusy(): boolean {
  return busy;
}

async function localSchemaVersion(): Promise<number> {
  const row = await queryFirst<{ v: number | null }>("SELECT MAX(version) AS v FROM _sqlx_migrations", []);
  return row?.v ?? 0;
}

export async function deviceName(): Promise<string> {
  const existing = await getSyncMeta(SYNC_META_KEYS.deviceId);
  if (existing !== null) return `device-${existing.slice(0, 8)}`;
  const id = uuid();
  await setSyncMeta(SYNC_META_KEYS.deviceId, id);
  return `device-${id.slice(0, 8)}`;
}

export async function syncNow(reason?: string): Promise<SyncReport> {
  void reason;
  if (busy) return emptyReport(Date.now(), "sync.errors.busy");
  busy = true;
  try {
    const schemaVersion = await localSchemaVersion();
    const provider = new SupabaseProvider();
    if (!(await provider.isConfigured())) return emptyReport(Date.now(), "sync.errors.notConnected");
    return runRound(provider, schemaVersion);
  } catch (error) {
    return emptyReport(Date.now(), errorKey(error));
  } finally {
    busy = false;
  }
}

export function errorKey(error: unknown): string {
  if (error instanceof TypeError && String(error.message).toLowerCase().includes("fetch")) return "sync.errors.network";
  if (error instanceof TypeError && String(error.message).includes("Failed to fetch")) return "sync.errors.network";
  if (!(error instanceof SupabaseError)) {
    console.error("[sync] unknown error", error);
    return "sync.errors.unknown";
  }
  switch (error.kind) {
    case "unauthorized":
      return "sync.errors.notConnected";
    case "conflict":
      return "sync.errors.conflict";
    case "network":
      return "sync.errors.network";
    default:
      console.error("[sync] Supabase other", error);
      return "sync.errors.unknown";
  }
}

export async function runRound(provider: SyncProvider, schemaVersion: number): Promise<SyncReport> {
  const device = await deviceName();
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const remote = await provider.download();
    let remotePayload: SyncPayload | null = null;
    let versionSkew: { local: number; remote: number } | null = null;
    if (remote !== null) {
      try {
        remotePayload = parsePayload(remote.text);
      } catch {
        return emptyReport(Date.now(), "sync.errors.invalidRemote");
      }
      if (remotePayload.schemaVersion !== schemaVersion) {
        versionSkew = { local: schemaVersion, remote: remotePayload.schemaVersion };
        console.warn(`[sync] version skew local v${schemaVersion} ↔ remote v${remotePayload.schemaVersion}, syncing compatible subset`);
      }
    }
    const base: SyncPayload = remotePayload ?? emptyPayload(device, schemaVersion);
    const before: LocalState = { rows: await buildLocalSnapshot(), tombstones: await listLocalTombstones() };
    const pull = remotePayload !== null ? mergePull(remotePayload, before) : null;
    if (pull !== null) await applyPullResult(pull);
    const after: LocalState = { rows: await buildLocalSnapshot(), tombstones: await listLocalTombstones() };
    const push = mergePush(base, after);
    const maxVersion = Math.max(schemaVersion, remotePayload?.schemaVersion ?? schemaVersion);
    if (push.payload.schemaVersion !== maxVersion) push.payload.schemaVersion = maxVersion;
    const needsVersionBump = versionSkew !== null && versionSkew.local > versionSkew.remote;
    if (!push.changed && !needsVersionBump) {
      await persistState(push.payload.revision);
      const report = buildReport(Date.now(), pull, push);
      if (versionSkew) {
        report.localVersion = versionSkew.local;
        report.remoteVersion = versionSkew.remote;
      }
      return report;
    }
    if (needsVersionBump && !push.changed) {
      push.payload.revision += 1;
      push.payload.pushedAt = Date.now();
    }
    try {
      await provider.upload(serializePayload(push.payload), remote?.etag ?? null);
      await persistState(push.payload.revision);
      const report = buildReport(Date.now(), pull, push);
      if (versionSkew) {
        report.localVersion = versionSkew.local;
        report.remoteVersion = versionSkew.remote;
      }
      return report;
    } catch (error) {
      const isConflict = error instanceof SupabaseError && error.kind === "conflict";
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
  return { revision: 0, device, pushedAt: 0, schemaVersion, rows: Object.fromEntries(SYNC_TABLE_NAMES.map((name) => [name, []])), tombstones: [] };
}
