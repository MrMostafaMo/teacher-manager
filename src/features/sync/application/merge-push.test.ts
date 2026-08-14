import { describe, expect, it } from "vitest";
import type { SyncPayload, SyncRow } from "../domain";
import { mergePush } from "./merge-push";

function row(id: string, updatedAt: number): SyncRow {
  return { id, name: `n-${id}`, updated_at: updatedAt };
}

function payload(rows: Array<[string, number]> = []): SyncPayload {
  return {
    revision: 3,
    device: "other",
    pushedAt: 0,
    schemaVersion: 15,
    rows: { students: rows.map(([id, updatedAt]) => row(id, updatedAt)) },
    tombstones: [],
  };
}

function local(rows: Array<[string, number]> = [], tombstones: Array<{ rowId: string; deletedAt: number }> = []) {
  return {
    rows: rows.map(([id, updatedAt]) => ({ tableName: "students", id, row: row(id, updatedAt) })),
    tombstones: tombstones.map((t) => ({ tableName: "students", ...t })),
  };
}

describe("mergePush", () => {
  it("adds rows the remote does not have and bumps the revision", () => {
    const result = mergePush(payload(), local([["s1", 100]]));
    expect(result.changed).toBe(true);
    expect(result.pushedRows).toBe(1);
    expect(result.payload.rows.students).toEqual([row("s1", 100)]);
    expect(result.payload.revision).toBe(4);
  });

  it("replaces a remote row when local is newer", () => {
    const result = mergePush(payload([["s1", 100]]), local([["s1", 200]]));
    expect(result.changed).toBe(true);
    expect(result.payload.rows.students[0].updated_at).toBe(200);
  });

  it("keeps the remote row when remote is newer", () => {
    const result = mergePush(payload([["s1", 300]]), local([["s1", 200]]));
    expect(result.changed).toBe(false);
    expect(result.payload.rows.students[0].updated_at).toBe(300);
  });

  it("does not mutate the remote payload passed in", () => {
    const remote = payload([["s1", 100]]);
    mergePush(remote, local([["s1", 200]]));
    expect(remote.rows.students[0].updated_at).toBe(100);
    expect(remote.revision).toBe(3);
  });

  it("pushes a tombstone and drops the remote row it outranks", () => {
    const remote = payload([["s1", 100]]);
    const result = mergePush(remote, local([], [{ rowId: "s1", deletedAt: 200 }]));
    expect(result.changed).toBe(true);
    expect(result.pushedTombstones).toBe(1);
    expect(result.payload.rows.students).toHaveLength(0);
    expect(result.payload.tombstones).toEqual([{ tableName: "students", rowId: "s1", deletedAt: 200 }]);
  });

  it("keeps a tombstone only when it outranks the remote row", () => {
    const remote = payload([["s1", 300]]);
    const result = mergePush(remote, local([], [{ rowId: "s1", deletedAt: 200 }]));
    expect(result.changed).toBe(false);
    expect(result.payload.tombstones).toHaveLength(0);
    expect(result.payload.rows.students[0].updated_at).toBe(300);
  });

  it("does not resurrect a row outranked by a remote tombstone", () => {
    const remote = payload([["s1", 100]]);
    remote.tombstones = [{ tableName: "students", rowId: "s1", deletedAt: 300 }];
    const result = mergePush(remote, local([["s1", 200]]));
    expect(result.changed).toBe(false);
    expect(result.payload.rows.students).toHaveLength(0);
  });

  it("removes a stale remote tombstone when the local row outranks it", () => {
    const remote = payload();
    remote.tombstones = [{ tableName: "students", rowId: "s1", deletedAt: 100 }];
    const result = mergePush(remote, local([["s1", 200]]));
    expect(result.changed).toBe(true);
    expect(result.payload.tombstones).toHaveLength(0);
    expect(result.payload.rows.students[0].updated_at).toBe(200);
  });

  it("dedups repeated tombstones for the same row", () => {
    const result = mergePush(
      payload(),
      local([], [{ rowId: "s1", deletedAt: 200 }, { rowId: "s1", deletedAt: 150 }]),
    );
    expect(result.pushedTombstones).toBe(1);
    expect(result.payload.tombstones).toHaveLength(1);
  });

  it("tracks per-table push counts", () => {
    const remote: SyncPayload = { ...payload(), rows: {} };
    const result = mergePush(remote, local([["s1", 100]]));
    expect(result.pushedByTable).toEqual({ students: 1 });
  });
});