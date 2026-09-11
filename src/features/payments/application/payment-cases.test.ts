import { beforeEach, describe, expect, it, vi } from "vitest";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { countPaymentHistory, listPaymentHistory } from "./payment-cases";

vi.mock("@/features/payments/infrastructure/payment-repo", () => ({
  paymentRepository: { listHistory: vi.fn(), countHistory: vi.fn() },
}));

function payment(id: string) {
  return { id, studentId: "st1", planId: "pl1", amount: 100, period: "2026-08", paidAt: 1 };
}

describe("listPaymentHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps joined rows with fallbacks for missing names", async () => {
    vi.mocked(paymentRepository.listHistory).mockResolvedValue([
      { payment: payment("p1") as never, studentName: "Ahmed", planName: "Monthly" },
      { payment: payment("p2") as never, studentName: null, planName: null },
    ]);
    const rows = await listPaymentHistory({});
    expect(rows).toEqual([
      { payment: payment("p1"), studentName: "Ahmed", planName: "Monthly" },
      { payment: payment("p2"), studentName: "—", planName: null },
    ]);
  });

  it("forwards studentId/period/limit/offset to the repository", async () => {
    vi.mocked(paymentRepository.listHistory).mockResolvedValue([]);
    await listPaymentHistory({ studentId: "st1", period: "2026-08", limit: 10, offset: 20 });
    expect(paymentRepository.listHistory).toHaveBeenCalledWith({
      studentId: "st1",
      period: "2026-08",
      limit: 10,
      offset: 20,
    });
  });

  it("counts with the same filters minus paging", async () => {
    vi.mocked(paymentRepository.countHistory).mockResolvedValue(7);
    await expect(countPaymentHistory({ studentId: "st1" })).resolves.toBe(7);
    expect(paymentRepository.countHistory).toHaveBeenCalledWith({ studentId: "st1", period: undefined });
  });
});
