import { describe, expect, it } from "vitest";
import { RECREATABLE_TABLES, repairStatements } from "./schema-repair";

describe("repairStatements", () => {
  it("returns no statements when nothing is missing", () => {
    expect(repairStatements([])).toEqual([]);
  });
  it("ignores tables that are not safe to recreate", () => {
    expect(repairStatements(["students", "study_groups"])).toEqual([]);
  });
  it("rebuilds plan_price_history with its index and sync trigger", () => {
    const stmts = repairStatements(["plan_price_history"]);
    expect(stmts).toHaveLength(4);
    expect(stmts[0]).toContain("CREATE TABLE IF NOT EXISTS `plan_price_history`");
    expect(stmts.join("\n")).toContain("trg_sync_plan_price_history");
  });
  it("covers every recreatable table with IF NOT EXISTS guards", () => {
    const stmts = repairStatements([...RECREATABLE_TABLES]);
    expect(stmts.length).toBeGreaterThan(RECREATABLE_TABLES.length);
    for (const s of stmts) {
      expect(s).toMatch(/IF NOT EXISTS|DROP TRIGGER IF EXISTS|CREATE TRIGGER/);
    }
  });
  it("emits tables in a stable order regardless of input order", () => {
    const a = repairStatements(["sync_tombstones", "activity_logs"]);
    const b = repairStatements(["activity_logs", "sync_tombstones"]);
    expect(a).toEqual(b);
  });
});
