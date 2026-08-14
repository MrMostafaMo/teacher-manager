import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteExpense } from "@/features/expenses/application/expense-cases";
import { useUndoStore } from "@/lib/undo-store";

const store = vi.hoisted(() => new Map<string, Record<string, unknown>>());

vi.mock("@/features/expenses/infrastructure/expense-repo", () => ({
  expenseRepository: {
    remove: vi.fn(async (id: string) => store.delete(id)),
  },
}));

vi.mock("@/lib/db/snapshot", () => ({
  captureRows: vi.fn(async (_table: unknown, ids: string[]) =>
    ids.map((id) => store.get(id)).filter((r): r is Record<string, unknown> => Boolean(r)),
  ),
  restoreRows: vi.fn(async (_table: unknown, rows: Array<Record<string, unknown>>) => {
    for (const row of rows) store.set(String(row.id), row);
  }),
}));

vi.mock("@/lib/activity-log", () => ({
  logActivity: vi.fn(async () => {}),
}));

const row = {
  id: "exp-1",
  title: "كراسات",
  amount: 150,
  category: "stationery",
  note: null,
  spentAt: 1710000000000,
  createdAt: 1710000000000,
  updatedAt: 1710000000000,
};

beforeEach(() => {
  store.set(row.id, { ...row });
});

afterEach(() => {
  store.clear();
  useUndoStore.setState({ entries: [] });
  vi.useRealTimers();
});

describe("deleteExpense undo round-trip", () => {
  it("registers an undo entry and restores the deleted row", async () => {
    const undoId = await deleteExpense(row.id);
    expect(undoId).not.toBeNull();
    expect(store.has(row.id)).toBe(false);

    await useUndoStore.getState().undo(undoId as number);

    expect(store.get(row.id)).toMatchObject(row);
    expect(useUndoStore.getState().entries).toHaveLength(0);
  });

  it("skips capture and returns null when undo is disabled", async () => {
    const undoId = await deleteExpense(row.id, { undo: false });
    expect(undoId).toBeNull();
    expect(store.has(row.id)).toBe(false);
    expect(useUndoStore.getState().entries).toHaveLength(0);
  });

  it("expired undo entries are dropped and cannot restore", async () => {
    vi.useFakeTimers();
    const undoId = await deleteExpense(row.id);
    expect(undoId).not.toBeNull();
    vi.advanceTimersByTime(5001);
    expect(useUndoStore.getState().entries).toHaveLength(0);
    expect(store.has(row.id)).toBe(false);
  });
});
