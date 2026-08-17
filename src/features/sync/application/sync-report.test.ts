import { describe, expect, it } from "vitest";
import type { PullResult } from "./merge-pull";
import type { PushResult } from "./merge-push";
import { buildReport, emptyReport } from "./sync-report";

const pull: PullResult = {
  toApply: [
    { key: { tableName: "students", rowId: "s1" }, row: { id: "s1" }, conflict: false },
    { key: { tableName: "students", rowId: "s2" }, row: { id: "s2" }, conflict: true },
    { key: { tableName: "payments", rowId: "p1" }, row: { id: "p1" }, conflict: false },
  ],
  toDelete: [{ tableName: "students", rowId: "s3" }],
  skipped: 4,
};

const push: PushResult = {
  payload: { revision: 1, device: "x", pushedAt: 0, schemaVersion: 15, rows: {}, tombstones: [] },
  changed: true,
  pushedRows: 2,
  pushedTombstones: 1,
  pushedByTable: { students: 1, payments: 1 },
};

describe("buildReport", () => {
  it("aggregates pull and push counts per table", () => {
    const report = buildReport(1000, pull, push);
    expect(report.at).toBe(1000);
    expect(report.tables.students).toEqual({ applied: 2, conflicts: 1, deleted: 1, pushed: 1 });
    expect(report.tables.payments).toEqual({ applied: 1, conflicts: 0, deleted: 0, pushed: 1 });
    expect(report.conflictTotal).toBe(1);
    expect(report.pushedTombstones).toBe(1);
    expect(report.error).toBeNull();
  });

  it("supports a pull-only round (first sync, nothing to push)", () => {
    const report = buildReport(1, pull, null);
    expect(report.tables.students).toEqual({ applied: 2, conflicts: 1, deleted: 1, pushed: 0 });
    expect(report.pushedTombstones).toBe(0);
  });

  it("carries an error key", () => {
    const report = buildReport(1, null, null, "sync.errors.notConnected");
    expect(report.error).toBe("sync.errors.notConnected");
    expect(report.tables).toEqual({});
  });

  it("emptyReport builds a zeroed report", () => {
    const report = emptyReport(5, "boom");
    expect(report).toEqual({
      at: 5,
      tables: {},
      pushedTombstones: 0,
      conflictTotal: 0,
      error: "boom",
    });
  });
});
