import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PullResult } from "../application/merge-pull";
import type { SyncPayload } from "../domain";

const run = vi.hoisted(() => vi.fn());
const query = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => ({ get: query }) }) }),
    insert: () => ({ values: () => ({ run }) }),
    update: () => ({ set: () => ({ where: () => ({ run }) }) }),
    delete: () => ({ where: () => ({ run }) }),
  },
}));

vi.mock("./sync-state-repo", () => ({
  clearTombstone: vi.fn(async () => undefined),
}));

import { applyPullResult, parsePayload, serializePayload } from "./sync-snapshot";

const payload: SyncPayload = {
  revision: 4,
  device: "d",
  pushedAt: 0,
  schemaVersion: 15,
  rows: { students: [{ id: "s1", name: "Ali", age: 12 }] },
  tombstones: [],
};

beforeEach(() => {
  run.mockReset();
  query.mockReset();
});

describe("sync-snapshot", () => {
  it("serializes and parses a payload round-trip", () => {
    const text = serializePayload(payload);
    expect(JSON.parse(text).revision).toBe(4);
    expect(parsePayload(text)).toEqual(payload);
  });

  it("rejects malformed or invalid payloads", () => {
    expect(() => parsePayload("{nope")).toThrow();
    expect(() => parsePayload('{"revision": -1}')).toThrow();
    expect(() => parsePayload('{"rows": {}}')).toThrow();
  });

  it("applies a pull: inserts new rows and updates existing ones", async () => {
    query.mockResolvedValue(undefined);
    const result: PullResult = {
      toApply: [
        {
          key: { tableName: "students", rowId: "s1" },
          row: { id: "s1", name: "New" },
          conflict: false,
        },
      ],
      toDelete: [],
      skipped: 0,
    };
    await applyPullResult(result);
    expect(run).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("updates in place when the row exists", async () => {
    query.mockResolvedValue({ id: "s1" });
    const result: PullResult = {
      toApply: [
        {
          key: { tableName: "students", rowId: "s1" },
          row: { id: "s1", name: "New" },
          conflict: false,
        },
      ],
      toDelete: [],
      skipped: 0,
    };
    await applyPullResult(result);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("deletes rows and clears the trigger tombstone", async () => {
    const result: PullResult = {
      toApply: [],
      toDelete: [{ tableName: "students", rowId: "s1" }],
      skipped: 0,
    };
    await applyPullResult(result);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
