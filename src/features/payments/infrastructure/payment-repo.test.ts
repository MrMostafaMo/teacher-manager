import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db/client";
import { paymentRepository } from "./payment-repo";

vi.mock("@/lib/db/client", () => ({ db: { select: vi.fn() } }));

interface Chain {
  from: ReturnType<typeof vi.fn>;
  leftJoin: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  offset: ReturnType<typeof vi.fn>;
  then: (resolve: (rows: unknown[]) => unknown) => Promise<unknown>;
}

function mockListHistory(rows: unknown[]): Chain {
  const q = {} as Chain & { rows: unknown[] };
  q.from = vi.fn(() => q);
  q.leftJoin = vi.fn(() => q);
  q.where = vi.fn(() => q);
  q.orderBy = vi.fn(() => q);
  q.limit = vi.fn(() => q);
  q.offset = vi.fn(() => q);
  q.then = (resolve) => Promise.resolve(rows).then(resolve);
  vi.mocked(db.select).mockReturnValue(q as never);
  return q;
}

function payment(id: string) {
  return { id, studentId: "st1", planId: "pl1", amount: 100, period: "2026-08", paidAt: 1 };
}

describe("paymentRepository.listHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("joins student and plan names in one query", async () => {
    const q = mockListHistory([{ payment: payment("p1"), studentName: "Ahmed", planName: "Monthly" }]);
    const rows = await paymentRepository.listHistory({});
    expect(rows).toEqual([{ payment: payment("p1"), studentName: "Ahmed", planName: "Monthly" }]);
    expect(q.leftJoin).toHaveBeenCalledTimes(2);
    expect(q.orderBy).toHaveBeenCalledTimes(1);
    expect(q.limit).not.toHaveBeenCalled();
    expect(q.offset).not.toHaveBeenCalled();
  });

  it("preserves nulls for missing student/plan (fallbacks live in the case)", async () => {
    mockListHistory([
      { payment: payment("p1"), studentName: null, planName: null },
      { payment: payment("p2"), studentName: "Sara", planName: null },
    ]);
    const rows = await paymentRepository.listHistory({ studentId: "st1" });
    expect(rows[0].studentName).toBeNull();
    expect(rows[0].planName).toBeNull();
    expect(rows[1]).toMatchObject({ studentName: "Sara", planName: null });
  });

  it("passes limit/offset through only when defined", async () => {
    const q = mockListHistory([]);
    await paymentRepository.listHistory({ limit: 20, offset: 40 });
    expect(q.limit).toHaveBeenCalledWith(20);
    expect(q.offset).toHaveBeenCalledWith(40);
  });
});
