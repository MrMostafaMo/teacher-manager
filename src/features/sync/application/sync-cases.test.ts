import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncPayload, SyncRow } from "../domain";

const meta = new Map<string, string>();
const download = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn());
const buildLocalSnapshot = vi.hoisted(() => vi.fn());
const applyPullResult = vi.hoisted(() => vi.fn());
const FakeErr = vi.hoisted(() => {
  return class extends Error {
    kind: string;
    constructor(k: string, m: string) {
      super(m);
      this.kind = k;
    }
  };
});

vi.mock("@/lib/db/client", () => ({ queryFirst: vi.fn(async () => ({ v: 15 })) }));
vi.mock("@/lib/utils/uuid", () => ({ uuid: vi.fn(() => "dev-1234567890") }));
vi.mock("../infrastructure/supabase-http", () => ({ SupabaseError: FakeErr }));
vi.mock("../infrastructure/supabase-provider", () => ({
  SupabaseProvider: class {
    id = "supabase" as const;
    isConfigured = vi.fn(async () => meta.has("supabase_access_token"));
    download = download;
    upload = upload;
    uploadBytes = vi.fn();
    listFiles = vi.fn();
    downloadBytes = vi.fn();
  },
}));
vi.mock("../infrastructure/sync-snapshot", () => ({
  buildLocalSnapshot,
  applyPullResult,
  parsePayload: vi.fn((t: string) => JSON.parse(t)),
  serializePayload: vi.fn((p: SyncPayload) => JSON.stringify(p)),
}));
vi.mock("../infrastructure/sync-state-repo", () => ({
  SYNC_META_KEYS: {
    supabaseUrl: "supabase_url",
    supabaseAnonKey: "supabase_anon_key",
    supabaseAccessToken: "supabase_access_token",
    supabaseRefreshToken: "supabase_refresh_token",
    supabaseExpiresAt: "supabase_expires_at",
    supabaseUserId: "supabase_user_id",
    supabaseEmail: "supabase_email",
    deviceId: "device_id",
    deviceName: "device_name",
    lastRevision: "last_revision",
    lastSyncAt: "last_sync_at",
  },
  getSyncMeta: vi.fn(async (k: string) => meta.get(k) ?? null),
  setSyncMeta: vi.fn(async (k: string, v: string | number) => meta.set(k, String(v))),
  listLocalTombstones: vi.fn(async () => []),
}));

import { syncNow } from "./sync-cases";
import { SupabaseError } from "../infrastructure/supabase-http";

function row(id: string, updatedAt: number): SyncRow {
  return { id, name: `n-${id}`, updated_at: updatedAt };
}
function remotePayload(revision = 5): SyncPayload {
  return { revision, device: "other", pushedAt: 0, schemaVersion: 15, rows: { students: [row("s1", 100)] }, tombstones: [] };
}

beforeEach(() => {
  meta.clear();
  meta.set("supabase_access_token", "at");
  meta.set("supabase_refresh_token", "rt");
  meta.set("supabase_url", "https://x.supabase.co");
  meta.set("supabase_anon_key", "anon");
  download.mockReset();
  upload.mockReset();
  buildLocalSnapshot.mockReset();
  applyPullResult.mockReset();
});

describe("sync-cases", () => {
  it("reports notConnected without touching remote", async () => {
    meta.clear();
    const r = await syncNow();
    expect(r.error).toBe("sync.errors.notConnected");
    expect(download).not.toHaveBeenCalled();
  });
  it("pushes everything on the first sync (no remote)", async () => {
    download.mockResolvedValue(null);
    buildLocalSnapshot.mockResolvedValue([{ tableName: "students", id: "s1", row: row("s1", 100) }]);
    const r = await syncNow();
    expect(r.error).toBeNull();
    expect(upload).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(upload.mock.calls[0][0]) as SyncPayload;
    expect(payload.revision).toBe(1);
    expect(payload.rows.students).toHaveLength(1);
    expect(meta.get("last_revision")).toBe("1");
  });
  it("applies a remote pull and skips pushing when nothing changed", async () => {
    download.mockResolvedValue({ text: JSON.stringify(remotePayload()), etag: "etag-1" });
    buildLocalSnapshot.mockResolvedValue([{ tableName: "students", id: "s1", row: row("s1", 100) }]);
    const r = await syncNow();
    expect(applyPullResult).toHaveBeenCalledTimes(1);
    expect(r.error).toBeNull();
    expect(upload).not.toHaveBeenCalled();
    expect(meta.get("last_revision")).toBe("5");
  });
  it("retries on an upload conflict and still succeeds", async () => {
    download.mockResolvedValue({ text: JSON.stringify(remotePayload()), etag: "etag-1" });
    buildLocalSnapshot.mockResolvedValue([{ tableName: "students", id: "s1", row: row("s1", 200) }]);
    upload.mockRejectedValueOnce(new SupabaseError("conflict", "changed")).mockResolvedValueOnce(undefined);
    const r = await syncNow();
    expect(r.error).toBeNull();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(download).toHaveBeenCalledTimes(2);
  });
  it("syncs with warning when schema version differs (lenient)", async () => {
    const remote = remotePayload();
    remote.schemaVersion = 14;
    download.mockResolvedValue({ text: JSON.stringify(remote), etag: "etag-1" });
    buildLocalSnapshot.mockResolvedValue([{ tableName: "students", id: "s1", row: row("s1", 100) }]);
    const r = await syncNow();
    expect(r.error).toBeNull();
    expect(r.localVersion).toBe(15);
    expect(r.remoteVersion).toBe(14);
  });
  it("reports invalid remote payloads", async () => {
    download.mockResolvedValue({ text: "{not json", etag: null });
    const r = await syncNow();
    expect(r.error).toBe("sync.errors.invalidRemote");
  });
});
