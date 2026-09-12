import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, queryAll, queryFirst } from "@/lib/db/client";
import { EXPECTED_TABLES, listTables, verifySchema } from "./schema-check";

vi.mock("@/lib/db/client", () => ({
  db: { select: vi.fn() },
  queryAll: vi.fn(),
  queryFirst: vi.fn(),
}));

function mockTables(names: Array<string | null>) {
  const q = {
    from: vi.fn(() => q),
    where: vi.fn(() => Promise.resolve(names.map((name) => ({ name })))),
  };
  vi.mocked(db.select).mockReturnValue(q as never);
}

const ALL_COLUMNS = [
  "id",
  "group_id",
  "day_of_week",
  "start_time",
  "end_time",
  "room",
  "one_off_date",
  "moved_from_session_id",
  "moved_from_date",
  "created_at",
  "updated_at",
];

function mockColumns(names: string[]) {
  vi.mocked(queryAll).mockResolvedValue(names.map((name) => ({ name })));
}

beforeEach(() => vi.clearAllMocks());

describe("verifySchema", () => {
  it("is ok when every table and column exists and quick_check passes", async () => {
    mockTables(EXPECTED_TABLES);
    mockColumns(ALL_COLUMNS);
    vi.mocked(queryFirst).mockResolvedValue({ quick_check: "ok" });
    expect(await verifySchema()).toEqual({
      ok: true,
      missingTables: [],
      missingColumns: {},
      integrity: "ok",
    });
  });
  it("reports missing tables (e.g. a damaged group_sessions)", async () => {
    mockTables(EXPECTED_TABLES.filter((t) => t !== "group_sessions"));
    mockColumns(ALL_COLUMNS);
    vi.mocked(queryFirst).mockResolvedValue({ quick_check: "ok" });
    const r = await verifySchema();
    expect(r.ok).toBe(false);
    expect(r.missingTables).toEqual(["group_sessions"]);
    expect(r.missingColumns).toEqual({});
  });
  it("reports missing v25 columns on an otherwise healthy file", async () => {
    mockTables(EXPECTED_TABLES);
    mockColumns(ALL_COLUMNS.filter((c) => c !== "one_off_date"));
    vi.mocked(queryFirst).mockResolvedValue({ quick_check: "ok" });
    const r = await verifySchema();
    expect(r.ok).toBe(false);
    expect(r.missingColumns).toEqual({ group_sessions: ["one_off_date"] });
  });
  it("fails when quick_check reports corruption", async () => {
    mockTables(EXPECTED_TABLES);
    mockColumns(ALL_COLUMNS);
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
