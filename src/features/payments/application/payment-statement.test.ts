import { describe, expect, it } from "vitest";
import type { Payment, Student } from "@/lib/db/schema";
import { computeStatement, statementPeriods } from "./payment-statement";

function payment(overrides: Partial<Payment>): Payment {
  return {
    id: "p",
    studentId: "s1",
    planId: null,
    amount: 100,
    period: "2026-01",
    method: "cash",
    note: null,
    paidAt: Date.parse("2026-01-10T00:00:00"),
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: "s1",
    name: "أحمد",
    phone: null,
    guardianName: null,
    guardianPhone: null,
    notes: null,
    planId: null,
    status: "active",
    enrolledOn: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

describe("statementPeriods", () => {
  it("uses the enrollment month, falling back to the first paid period", () => {
    expect(
      statementPeriods(student({ enrolledOn: "2026-03-10" }), [payment({})], "2026-05"),
    ).toEqual({ firstPeriod: "2026-03", endPeriod: "2026-05" });

    expect(
      statementPeriods(student({ enrolledOn: null }), [payment({})], "2026-05"),
    ).toEqual({ firstPeriod: "2026-01", endPeriod: "2026-05" });
  });

  it("extends to the last paid period when it is later than today", () => {
    expect(
      statementPeriods(student({ enrolledOn: null }), [payment({ period: "2026-09" })], "2026-05"),
    ).toEqual({ firstPeriod: "2026-09", endPeriod: "2026-09" });
  });
});

describe("computeStatement", () => {
  const payments = [
    payment({ id: "a", period: "2026-02", amount: 100, paidAt: Date.parse("2026-02-05T00:00:00") }),
    payment({ id: "b", period: "2026-01", amount: 50, paidAt: Date.parse("2026-01-05T00:00:00") }),
  ];

  it("builds per-month rows with running balance and a chronological ledger", () => {
    const s = computeStatement(200, payments, "2026-01", "2026-03");
    expect(s.months.map((m) => m.period)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(s.months[0]).toEqual({ period: "2026-01", due: 200, paid: 50, balance: 150, running: 150 });
    expect(s.months[2]).toEqual({ period: "2026-03", due: 200, paid: 0, balance: 200, running: 450 });
    expect(s.payments.map((p) => p.payment.id)).toEqual(["b", "a"]);
    expect(s.payments[1].cumulativePaid).toBe(150);
    expect(s.totalDue).toBe(600);
    expect(s.totalPaid).toBe(150);
    expect(s.totalBalance).toBe(450);
  });

  it("yields a negative balance when the student is paid ahead", () => {
    const s = computeStatement(100, [payment({ period: "2026-01", amount: 150 })], "2026-01", "2026-01");
    expect(s.months[0].running).toBe(-50);
    expect(s.totalBalance).toBe(-50);
  });
});
