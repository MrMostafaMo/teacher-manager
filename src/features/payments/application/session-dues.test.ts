import { describe, it, expect } from "vitest";
import { cycleOf, statusForCount, paidCyclesFor, buildSessionDues } from "./session-dues";
import type { Payment, Plan, Student } from "@/lib/db/schema";
function mkStudent(id: string, name: string, planId: string | null = null): Student {
  return { id, name, planId, status: "active", phone: null, guardianName: null, guardianPhone: null, notes: null, enrolledOn: "2026-01-01", birthDate: null, gradeLevel: null, photoUrl: null, createdAt: 0, updatedAt: 0 } as unknown as Student;
}
function mkPlan(id: string, amount: number): Plan {
  return { id, name: "plan", amount, billingInterval: "monthly", createdAt: 0, updatedAt: 0 } as Plan;
}
function mkPayment(amount = 800, planId: string | null = null): Payment {
  return { id: `p-${amount}-${planId ?? "none"}`, studentId: "s", planId, amount, period: "2026-08", method: "cash", note: null, paidAt: 1, createdAt: 0, updatedAt: 0 } as Payment;
}
describe("cycleOf", () => {
  it("zero stays 0/8 in cycle 1", () => {
    expect(cycleOf(0, 8)).toEqual({ count: 0, cycleNumber: 1, remainingSessions: 8 });
  });
  it("counts 1..8 inside cycle 1", () => {
    expect(cycleOf(1, 8)).toEqual({ count: 1, cycleNumber: 1, remainingSessions: 7 });
    expect(cycleOf(8, 8)).toEqual({ count: 8, cycleNumber: 1, remainingSessions: 0 });
  });
  it("wraps after a full cycle (9→1/8, 16→8/8, 17→1/8)", () => {
    expect(cycleOf(9, 8)).toEqual({ count: 1, cycleNumber: 2, remainingSessions: 7 });
    expect(cycleOf(16, 8)).toEqual({ count: 8, cycleNumber: 2, remainingSessions: 0 });
    expect(cycleOf(17, 8)).toEqual({ count: 1, cycleNumber: 3, remainingSessions: 7 });
  });
});
describe("statusForCount", () => {
  it("ok/warning/due", () => {
    expect(statusForCount(5, 8, 6)).toBe("ok");
    expect(statusForCount(6, 8, 6)).toBe("warning");
    expect(statusForCount(7, 8, 6)).toBe("warning");
    expect(statusForCount(8, 8, 6)).toBe("due");
    expect(statusForCount(0, 8, 6)).toBe("ok");
  });
});
describe("paidCyclesFor", () => {
  it("full amount is one cycle, double is two", () => {
    const plan = mkPlan("pl", 800);
    expect(paidCyclesFor([mkPayment(800, "pl")], plan)).toBe(1);
    expect(paidCyclesFor([mkPayment(1600, "pl")], plan)).toBe(2);
  });
  it("partial amount below the plan buys nothing", () => {
    const plan = mkPlan("pl", 800);
    expect(paidCyclesFor([mkPayment(400, "pl")], plan)).toBe(0);
    expect(paidCyclesFor([mkPayment(400, "pl"), mkPayment(400, "pl")], plan)).toBe(1);
  });
  it("no plan counts one cycle per payment", () => {
    expect(paidCyclesFor([mkPayment(50), mkPayment(50)], null)).toBe(2);
    expect(paidCyclesFor([], null)).toBe(0);
  });
});
describe("buildSessionDues", () => {
  it("counter ignores payments: 10 days + 1 payment stays total 10, 2/8, cycle 2", () => {
    const s = mkStudent("s1", "Ahmed");
    const r = buildSessionDues([s], new Map([["s1", [mkPayment(800)]]]), new Map([["s1", 10]]), new Map(), new Map(), 8, 6)[0];
    expect(r.total).toBe(10);
    expect(r.count).toBe(2);
    expect(r.cycleNumber).toBe(2);
    expect(r.remainingSessions).toBe(6);
    expect(r.status).toBe("ok");
  });
  it("paid badge follows cycles, not the counter", () => {
    const s = mkStudent("s1", "Mona", "pl1");
    const plan = mkPlan("pl1", 800);
    const plans = new Map([["pl1", plan]]);
    const unpaid = buildSessionDues([s], new Map(), new Map([["s1", 9]]), plans, new Map(), 8, 6)[0];
    expect(unpaid.count).toBe(1);
    expect(unpaid.cycleNumber).toBe(2);
    expect(unpaid.isPaid).toBe(false);
    expect(unpaid.paidCycles).toBe(0);
    const paid = buildSessionDues([s], new Map([["s1", [mkPayment(1600, "pl1")]]]), new Map([["s1", 9]]), plans, new Map(), 8, 6)[0];
    expect(paid.count).toBe(1);
    expect(paid.cycleNumber).toBe(2);
    expect(paid.isPaid).toBe(true);
    expect(paid.paidCycles).toBe(2);
  });
  it("zero days is 0/8 cycle 1, unpaid without prepayment", () => {
    const s = mkStudent("s1", "Ziad");
    const r = buildSessionDues([s], new Map(), new Map(), new Map(), new Map(), 8, 6)[0];
    expect(r.count).toBe(0);
    expect(r.cycleNumber).toBe(1);
    expect(r.isPaid).toBe(false);
  });
  it("sorts due first, then unpaid before paid", () => {
    const s1 = mkStudent("s1", "Ahmed");
    const s2 = mkStudent("s2", "Mona");
    const s3 = mkStudent("s3", "Ziad");
    const rows = buildSessionDues(
      [s1, s2, s3],
      new Map([["s3", [mkPayment(800)]]]),
      new Map([["s1", 8], ["s2", 6], ["s3", 8]]),
      new Map(),
      new Map(),
      8,
      6,
    );
    expect(rows[0].student.id).toBe("s1");
    expect(rows[0].status).toBe("due");
    expect(rows[1].student.id).toBe("s3");
    expect(rows[1].isPaid).toBe(true);
    expect(rows[2].status).toBe("warning");
  });
});
