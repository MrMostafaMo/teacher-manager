import { describe, expect, it } from "vitest";
import type { SyncPayload, SyncRow } from "../domain";
import { mergePull } from "./merge-pull";

function row(id: string, updatedAt: number, extra: SyncRow = {}): SyncRow {
  return { id, name: `n-${id}`, updated_at: updatedAt, ...extra };
}

function payload(rows: Array<{ id: string; updatedAt: number; extra?: SyncRow }>): SyncPayload {
  return {
    revision: 3,
    device: "other",
    pushedAt: 0,
    schemaVersion: 15,
    rows: { students: rows.map((r) => row(r.id, r.updatedAt, r.extra)) },
    tombstones: [],
  };
}

describe("mergePull", () => {
  it("inserts rows missing locally", () => {
    const result = mergePull(payload([{ id: "s1", updatedAt: 100 }]), { rows: [], tombstones: [] });
    expect(result.toApply).toHaveLength(1);
    expect(result.toApply[0]).toMatchObject({ conflict: false });
    expect(result.toApply[0].key).toEqual({ tableName: "students", rowId: "s1" });
    expect(result.toDelete).toHaveLength(0);
    expect(result.skipped).toBe(0);
  });

  it("updates a local row when remote is newer", () => {
    const local = { rows: [{ tableName: "students", id: "s1", row: row("s1", 100) }], tombstones: [] };
    const result = mergePull(payload([{ id: "s1", updatedAt: 200 }]), local);
    expect(result.toApply).toHaveLength(1);
    expect(result.toApply[0].conflict).toBe(true);
  });

  it("skips a remote row when local is newer (local wins)", () => {
    const local = { rows: [{ tableName: "students", id: "s1", row: row("s1", 300) }], tombstones: [] };
    const result = mergePull(payload([{ id: "s1", updatedAt: 200 }]), local);
    expect(result.toApply).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("skips an identical remote row (no churn)", () => {
    const same = row("s1", 200);
    const local = { rows: [{ tableName: "students", id: "s1", row: same }], tombstones: [] };
    const result = mergePull(payload([{ id: "s1", updatedAt: 200 }]), local);
    expect(result.toApply).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("deletes a local row outranked by a remote tombstone", () => {
    const local = { rows: [{ tableName: "students", id: "s1", row: row("s1", 100) }], tombstones: [] };
    const remote = payload([{ id: "s1", updatedAt: 100 }]);
    remote.tombstones = [{ tableName: "students", rowId: "s1", deletedAt: 200 }];
    const result = mergePull(remote, local);
    expect(result.toDelete).toEqual([{ tableName: "students", rowId: "s1" }]);
    expect(result.toApply).toHaveLength(0);
  });

  it("does not apply a remote row outranked by a local tombstone", () => {
    const remote = payload([{ id: "s1", updatedAt: 100 }]);
    const local = {
      rows: [],
      tombstones: [{ tableName: "students", rowId: "s1", deletedAt: 200 }],
    };
    const result = mergePull(remote, local);
    expect(result.toApply).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });

  it("resurrects a row when its remote edit is newer than the remote tombstone", () => {
    const remote = payload([{ id: "s1", updatedAt: 300 }]);
    remote.tombstones = [{ tableName: "students", rowId: "s1", deletedAt: 200 }];
    const result = mergePull(remote, { rows: [], tombstones: [] });
    expect(result.toApply).toHaveLength(1);
    expect(result.toDelete).toHaveLength(0);
  });

  it("ignores rows without an id", () => {
    const remote = payload([{ id: "s1", updatedAt: 100 }]);
    remote.rows.students.push({ name: "no-id", updated_at: 5 });
    const result = mergePull(remote, { rows: [], tombstones: [] });
    expect(result.toApply).toHaveLength(1);
  });
});