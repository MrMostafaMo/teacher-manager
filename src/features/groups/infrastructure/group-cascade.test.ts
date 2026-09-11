import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { removeGroupCascade } from "./group-cascade";

vi.mock("@/lib/db/client", () => ({
  db: {
    batch: vi.fn(),
    delete: vi.fn(() => ({ where: vi.fn() })),
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn() })) })),
  },
}));

describe("removeGroupCascade", () => {
  it("deletes the group and children in one batch", async () => {
    await removeGroupCascade("g1");
    expect(db.batch).toHaveBeenCalledTimes(1);
    expect(vi.mocked(db.batch).mock.calls[0][0]).toHaveLength(9);
  });
});
