import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import {
  addWeakPoint,
  listStudentWeakPoints,
  removeWeakPoint,
  updateWeakPoint,
} from "@/features/weak-points/application/weak-point-cases";
import { useUndoStore } from "@/lib/undo-store";

const store = vi.hoisted(() => new Map<string, Record<string, unknown>>());
const insert = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const remove = vi.hoisted(() => vi.fn());
const byStudent = vi.hoisted(() => vi.fn());

vi.mock("@/features/weak-points/infrastructure/weak-point-repo", () => ({
  weakPointRepository: { insert, update, remove, byStudent },
}));

vi.mock("@/lib/db/snapshot", () => ({
  captureRows: vi.fn(async (_t: unknown, ids: string[]) =>
    ids.map((id) => store.get(id)).filter((r): r is Record<string, unknown> => Boolean(r)),
  ),
  restoreRows: vi.fn(async (_t: unknown, rows: Array<Record<string, unknown>>) => {
    for (const row of rows) store.set(String(row.id), row);
  }),
}));

vi.mock("@/lib/activity-log", () => ({ logActivity: vi.fn(async () => {}) }));

const row = {
  id: "wp-1",
  studentId: "s1",
  description: "القسمة المطولة",
  recordedOn: 1710000000000,
  resolved: 0,
  createdAt: 1710000000000,
  updatedAt: 1710000000000,
};

beforeEach(() => {
  insert.mockImplementation(async (v: Record<string, unknown>) => ({
    id: v.id,
    ...v,
    createdAt: 1,
    updatedAt: 1,
  }));
  update.mockImplementation(async (_id: string, v: Record<string, unknown>) => ({
    ...row,
    ...v,
  }));
  byStudent.mockImplementation(async () => [
    row,
    { ...row, id: "wp-2", resolved: 1 },
  ]);
  remove.mockImplementation(async (id: string) => store.delete(id));
  store.set(row.id, { ...row });
});

afterEach(() => {
  store.clear();
  vi.clearAllMocks();
  useUndoStore.setState({ entries: [] });
});

describe("listStudentWeakPoints", () => {
  it("normalizes the resolved flag to a boolean", async () => {
    const rows = await listStudentWeakPoints("s1");
    expect(rows[0]).toMatchObject({ id: "wp-1", resolved: false });
    expect(rows[1]).toMatchObject({ id: "wp-2", resolved: true });
  });
});

describe("addWeakPoint", () => {
  it("rejects a blank description", async () => {
    await expect(
      addWeakPoint("s1", { description: "   ", recordedOn: 1, resolved: false }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(insert).not.toHaveBeenCalled();
  });

  it("stores resolved as 1 and returns it as true", async () => {
    const added = await addWeakPoint("s1", {
      description: "القراءة",
      recordedOn: 1710000000000,
      resolved: true,
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ studentId: "s1", description: "القراءة", resolved: 1 }),
    );
    expect(added.resolved).toBe(true);
  });
});

describe("updateWeakPoint", () => {
  it("throws when the row is missing", async () => {
    update.mockImplementationOnce(async () => undefined);
    await expect(
      updateWeakPoint("nope", { description: "x", recordedOn: 1, resolved: false }),
    ).rejects.toThrow("not found");
  });
});

describe("removeWeakPoint undo round-trip", () => {
  it("registers an undo entry and restores the deleted row", async () => {
    const undoId = await removeWeakPoint(row.id);
    expect(undoId).not.toBeNull();
    expect(store.has(row.id)).toBe(false);

    await useUndoStore.getState().undo(undoId as number);

    expect(store.get(row.id)).toMatchObject(row);
    expect(useUndoStore.getState().entries).toHaveLength(0);
  });

  it("skips capture and returns null when undo is disabled", async () => {
    const undoId = await removeWeakPoint(row.id, { undo: false });
    expect(undoId).toBeNull();
    expect(store.has(row.id)).toBe(false);
    expect(useUndoStore.getState().entries).toHaveLength(0);
  });
});
