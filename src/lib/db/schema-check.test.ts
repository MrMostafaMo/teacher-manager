import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, queryFirst } from "@/lib/db/client";
import { EXPECTED_TABLES, listTables, verifySchema } from "./schema-check";

vi.mock("@/lib/db/client", () => ({ db: { select: vi.fn() }, queryFirst: vi.fn() }));

function mockTables(names: Array<string | null>) {
  const q = {
    from: vi.fn(() => q),
    where: vi.fn(() => Promise.resolve(names.map((name) => ({ name })))),
  };
  vi.mocked(db.select).mockReturnValue(q as never);
}

beforeEach(() => vi.clearAllMocks());

describe("verifySchema", () => {
  it("is ok when every table exists and quick_check passes", async () => {
    mockTables(EXPECTED_TABLES);
    vi.mocked(queryFirst).mockResolvedValue({ quick_check: "ok" });
    const r = await verifySchema();
    expect(r).toEqual({ ok: true, missingTables: [], integrity: "ok" });
  });
  it("reports missing tables (e.g. a damaged group_sessions)", async () => {
    mockTables(EXPECTED_TABLES.filter((t) => t !== "group_sessions"));
    vi.mocked(queryFirst).mockResolvedValue({ quick_check: "ok" });
    const r = await verifySchema();
    expect(r.ok).toBe(false);
    expect(r.missingTables).toEqual(["group_sessions"]);
  });
  it("fails when quick_check reports corruption", async () => {
    mockTables(EXPECTED_TABLES);
    vi.mocked(queryFirst).mockResolvedValue({ quick_check: "*** corruption ***" });
    const r = await verifySchema();
    expect(r.ok).toBe(false);
    expect(r.missingTables).toEqual([]);
  });
  it("never throws when the database is unreachable", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("file is not a database");
    });
    const r = await verifySchema();
    expect(r.ok).toBe(false);
    expect(r.integrity).toContain("not a database");
  });
});

describe("listTables", () => {
  it("returns table names, skipping nulls", async () => {
    mockTables(["students", null]);
    expect(await listTables()).toEqual(["students"]);
  });
});
