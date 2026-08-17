import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureBy, captureIn, captureRows, restoreRows } from "./snapshot";
import { expenses, students } from "@/lib/db/schema";

/**
 * Plumb-level fake: `db.select()` resolves to whatever rows the test planted,
 * `db.insert().values().run()` appends verbatim. Filtering semantics belong to
 * drizzle + the real SQLite engine (covered by the app's E2E); this suite pins
 * the capture/restore contract the delete-undo flows rely on.
 */
const { store } = vi.hoisted(() => {
  let rows: Record<string, unknown>[] = [];
  return {
    store: {
      set: (next: Record<string, unknown>[]) => {
        rows = next;
      },
      get: () => rows,
    },
  };
});

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => Promise.resolve(store.get()),
      }),
    }),
    insert: () => ({
      values: (row: unknown) => ({
        run: async () => {
          const prev = store.get();
          const next = Array.isArray(row) ? row : [row];
          store.set([...prev, ...next] as Record<string, unknown>[]);
        },
      }),
    }),
    delete: () => ({
      where: () => ({
        run: async () => {},
      }),
    }),
  },
}));

describe("snapshot helpers", () => {
  beforeEach(() => store.set([]));

  it("captureRows returns the planted rows", async () => {
    const a = { id: "a", title: "A", createdAt: 1, updatedAt: 1 };
    const b = { id: "b", title: "B", createdAt: 2, updatedAt: 2 };
    store.set([a, b]);
    expect(await captureRows(expenses, ["a"])).toEqual([a, b]);
  });

  it("captureRows with empty ids is a no-op", async () => {
    store.set([{ id: "a" }]);
    expect(await captureRows(expenses, [])).toEqual([]);
  });

  it("captureBy returns the planted rows", async () => {
    store.set([{ id: "s1", planId: "p1" }]);
    expect(await captureBy(students, students.planId, "p1")).toEqual([{ id: "s1", planId: "p1" }]);
  });

  it("captureIn with empty values is a no-op", async () => {
    expect(await captureIn(expenses, expenses.id, [])).toEqual([]);
  });

  it("restoreRows re-inserts rows verbatim (ids + timestamps preserved)", async () => {
    const original = [{ id: "x", amount: 50, createdAt: 11, updatedAt: 12 }];
    await restoreRows(expenses, original as unknown as (typeof expenses.$inferSelect)[]);
    expect(store.get()).toEqual(original);
  });

  it("round trip: capture, wipe, restore keeps the exact rows", async () => {
    const rows = [
      { id: "r1", title: "one", createdAt: 5, updatedAt: 6 },
      { id: "r2", title: "two", createdAt: 7, updatedAt: 8 },
    ];
    store.set(rows);
    const captured = await captureRows(expenses, ["r1", "r2"]);
    store.set([]);
    await restoreRows(expenses, captured);
    expect(store.get()).toEqual(rows);
  });
});
