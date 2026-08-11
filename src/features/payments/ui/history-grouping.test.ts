import { describe, expect, it } from "vitest";
import type { Payment } from "@/lib/db/schema";
import { groupPaymentHistory, sectionTotal } from "./history-grouping";
import type { PaymentHistoryRow } from "@/features/payments/application/payment-cases";

function row(id: string, studentId: string, amount: number): PaymentHistoryRow {
  return {
    payment: {
      id,
      studentId,
      amount,
      period: "2026-05",
      method: "cash",
      paidAt: 100,
      createdAt: 0,
      updatedAt: 0,
    } as Payment,
    studentName: "Student",
    planName: null,
  };
}

describe("groupPaymentHistory", () => {
  it("keeps rows without groups ungrouped", () => {
    const rows = [row("p1", "s1", 100)];
    const { sections, ungrouped } = groupPaymentHistory(rows, new Map());
    expect(sections).toEqual([]);
    expect(ungrouped.map((r) => r.payment.id)).toEqual(["p1"]);
  });

  it("buckets rows per group, sorted by name", () => {
    const groupsByStudent = new Map([["s1", [{ id: "gB", name: "Beta" }, { id: "gA", name: "Alpha" }]]]);
    const rows = [row("p1", "s1", 100), row("p2", "s1", 50)];
    const { sections } = groupPaymentHistory(rows, groupsByStudent);
    expect(sections.map((s) => s.name)).toEqual(["Alpha", "Beta"]);
    expect(sections[0].list.map((r) => r.payment.id)).toEqual(["p1", "p2"]);
  });

  it("counts a multi-group row once per section but not ungrouped", () => {
    const groupsByStudent = new Map([["s1", [{ id: "g1", name: "A" }]]]);
    const { sections, ungrouped } = groupPaymentHistory([row("p1", "s1", 100)], groupsByStudent);
    expect(ungrouped).toEqual([]);
    expect(sections).toHaveLength(1);
  });
});

describe("sectionTotal", () => {
  it("sums the payment amounts in a list", () => {
    expect(sectionTotal([row("p1", "s1", 100), row("p2", "s1", 50), row("p3", "s2", 25)])).toBe(175);
  });

  it("is zero for an empty list", () => {
    expect(sectionTotal([])).toBe(0);
  });
});
