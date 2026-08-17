import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncPayload, SyncRow } from "../domain";

const meta = new Map<string, string>();
const download = vi.hoisted(() => vi.fn());
const upload = vi.hoisted(() => vi.fn());
const buildLocalSnapshot = vi.hoisted(() => vi.fn());
const applyPullResult = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  queryFirst: vi.fn(async () => ({ v: 15 })),
}));

vi.mock("@/lib/utils/uuid", () => ({ uuid: vi.fn(() => "dev-1234567890") }));

vi.mock("../infrastructure/drive-client", () => {
  class FakeDriveError extends Error {
    kind: string;
    constructor(kind: string, message: string) {
      super(message);
      this.kind = kind;
    }
  }
  class FakeDriveClient {
    deps: unknown;
    constructor(deps: unknown) {
      this.deps = deps;
    }
    download = download;
    upload = upload;
  }
  return { DriveClient: FakeDriveClient, DriveError: FakeDriveError };
});

vi.mock("../infrastructure/sync-snapshot", () => ({
  buildLocalSnapshot,
  applyPullResult,
  parsePayload: vi.fn((text: string) => JSON.parse(text)),
  serializePayload: vi.fn((payload: SyncPayload) => JSON.stringify(payload)),
}));

vi.mock("../infrastructure/sync-state-repo", () => ({
  SYNC_META_KEYS: {
    clientId: "client_id",
    accessToken: "access_token",
    refreshToken: "refresh_token",
    tokenExpiresAt: "token_expires_at",
    accountEmail: "account_email",
    deviceId: "device_id",
    deviceName: "device_name",
    lastRevision: "last_revision",
    lastSyncAt: "last_sync_at",
  },
  clearAccountMeta: vi.fn(async () => {
    meta.clear();
  }),
  getSyncMeta: vi.fn(async (key: string) => meta.get(key) ?? null),
  setSyncMeta: vi.fn(async (key: string, value: string | number) => {
    meta.set(key, String(value));
  }),
  listLocalTombstones: vi.fn(async () => []),
}));

vi.mock("./oauth-cases", () => ({
  signInWithGoogle: vi.fn(async () => ({
    tokens: { accessToken: "at", refreshToken: "rt", expiresIn: 3600 },
    email: "me@example.com",
  })),
}));

vi.mock("../infrastructure/oauth-client", () => ({
  refreshAccessToken: vi.fn(async () => ({
    accessToken: "at",
    expiresIn: 3600,
    refreshToken: undefined,
  })),
}));

import { syncNow } from "./sync-cases";
import { buildDriveSession, connectAccount, disconnectAccount, isConnected } from "./sync-session";
import { DriveError } from "../infrastructure/drive-client";

function row(id: string, updatedAt: number): SyncRow {
  return { id, name: `n-${id}`, updated_at: updatedAt };
}

function remotePayload(revision = 5): SyncPayload {
  return {
    revision,
    device: "other",
    pushedAt: 0,
    schemaVersion: 15,
    rows: { students: [row("s1", 100)] },
    tombstones: [],
  };
}

beforeEach(() => {
  meta.clear();
  meta.set("client_id", "client-1");
  meta.set("refresh_token", "rt");
  meta.set("access_token", "at");
  meta.set("token_expires_at", String(Date.now() + 3600_000));
  download.mockReset();
  upload.mockReset();
  buildLocalSnapshot.mockReset();
  applyPullResult.mockReset();
});

describe("sync-cases", () => {
  it("reports notConnected without touching Drive", async () => {
    meta.clear();
    const report = await syncNow();
    expect(report.error).toBe("sync.errors.notConnected");
    expect(download).not.toHaveBeenCalled();
  });

  it("pushes everything on the first sync (no remote)", async () => {
    download.mockResolvedValue(null);
    buildLocalSnapshot.mockResolvedValue([
      { tableName: "students", id: "s1", row: row("s1", 100) },
    ]);
    const report = await syncNow();
    expect(report.error).toBeNull();
    expect(upload).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(upload.mock.calls[0][1]) as SyncPayload;
    expect(payload.revision).toBe(1);
    expect(payload.rows.students).toHaveLength(1);
    expect(payload.schemaVersion).toBe(15);
    expect(meta.get("last_revision")).toBe("1");
  });

  it("applies a remote pull and skips pushing when nothing changed", async () => {
    download.mockResolvedValue({ text: JSON.stringify(remotePayload()), etag: "etag-1" });
    buildLocalSnapshot.mockResolvedValue([
      { tableName: "students", id: "s1", row: row("s1", 100) },
    ]);
    const report = await syncNow();
    expect(applyPullResult).toHaveBeenCalledTimes(1);
    expect(report.error).toBeNull();
    expect(report.tables).toEqual({});
    expect(upload).not.toHaveBeenCalled();
    expect(meta.get("last_revision")).toBe("5");
  });

  it("retries on an upload conflict and still succeeds", async () => {
    download.mockResolvedValue({ text: JSON.stringify(remotePayload()), etag: "etag-1" });
    buildLocalSnapshot.mockResolvedValue([
      { tableName: "students", id: "s1", row: row("s1", 200) },
    ]);
    upload
      .mockRejectedValueOnce(new DriveError("conflict", "changed"))
      .mockResolvedValueOnce(undefined);
    const report = await syncNow();
    expect(report.error).toBeNull();
    expect(upload).toHaveBeenCalledTimes(2);
    expect(download).toHaveBeenCalledTimes(2);
  });

  it("blocks sync when the remote schema version differs", async () => {
    const remote = remotePayload();
    remote.schemaVersion = 14;
    download.mockResolvedValue({ text: JSON.stringify(remote), etag: "etag-1" });
    const report = await syncNow();
    expect(report.error).toBe("sync.errors.versionMismatch");
    expect(upload).not.toHaveBeenCalled();
  });

  it("reports invalid remote payloads", async () => {
    download.mockResolvedValue({ text: "{not json", etag: null });
    const report = await syncNow();
    expect(report.error).toBe("sync.errors.invalidRemote");
  });

  it("connects, persists credentials and disconnects", async () => {
    meta.clear();
    const email = await connectAccount("client-1");
    expect(email).toBe("me@example.com");
    expect(meta.get("account_email")).toBe("me@example.com");
    expect(await isConnected()).toBe(true);
    await disconnectAccount();
    expect(meta.size).toBe(0);
  });

  it("builds a drive session that refreshes an expired token", async () => {
    const session = await buildDriveSession();
    const token = await session.getToken();
    expect(token).toBe("at");
    meta.set("token_expires_at", "1");
    const refreshed = await session.refresh();
    expect(refreshed).toBe("at");
    expect(meta.get("token_expires_at")).not.toBe("1");
  });
});
