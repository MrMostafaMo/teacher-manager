import { describe, it, expect } from "vitest";
import { sessionsCoveredByPayment, uncoveredCount, deriveCycle, pricePerSession, statusForCount, buildSessionDues } from "./session-dues";
import type { Payment, Plan, Student } from "@/lib/db/schema";
function mkStudent(id: string, name: string, planId: string | null = null, offset = 0): Student {
  return { id, name, planId, status: "active", phone: null, guardianName: null, guardianPhone: null, notes: null, enrolledOn: "2026-01-01", birthDate: null, gradeLevel: null, photoUrl: null, sessionOffset: offset, createdAt: 0, updatedAt: 0 } as unknown as Student;
}
function mkPlan(id: string, amount: number): Plan {
  return { id, name: "plan", amount, billingInterval: "monthly", createdAt: 0, updatedAt: 0 } as Plan;
}
function mkPayment(studentId: string, paidAt: number, amount = 800, planId: string | null = null): Payment {
  return { id: `p-${paidAt}-${amount}`, studentId, planId, amount, period: "2026-08", method: "cash", note: null, paidAt, createdAt: 0, updatedAt: 0 } as Payment;
}
function atts(n: number): number {
  return n;
}
describe("sessionsCoveredByPayment", () => {
  it("full amount covers one cycle", () => { expect(sessionsCoveredByPayment(mkPayment("s", 1, 800, "pl"), mkPlan("pl", 800), 8)).toBe(8); });
  it("double amount covers two cycles", () => { expect(sessionsCoveredByPayment(mkPayment("s", 1, 1600, "pl"), mkPlan("pl", 800), 8)).toBe(16); });
  it("half amount covers half cycle", () => { expect(sessionsCoveredByPayment(mkPayment("s", 1, 400, "pl"), mkPlan("pl", 800), 8)).toBe(4); });
  it("no plan falls back to one cycle", () => { expect(sessionsCoveredByPayment(mkPayment("s", 1, 50), null, 8)).toBe(8); });
});
describe("uncoveredCount", () => {
  const empty = new Map<string, Plan>();
  it("no payments returns total", () => { expect(uncoveredCount(10, [], empty, null, 8)).toBe(10); });
  it("zero attendances stays zero even with payment", () => { expect(uncoveredCount(0, [mkPayment("s", 1)], empty, null, 8)).toBe(0); });
  it("early payment preserves balance (3 stays 3)", () => { expect(uncoveredCount(3, [mkPayment("s", 1)], empty, null, 8)).toBe(3); });
  it("exact cycle closes to zero (8-8=0)", () => { expect(uncoveredCount(8, [mkPayment("s", 1)], empty, null, 8)).toBe(0); });
  it("overdue carries over (10-8=2)", () => { expect(uncoveredCount(10, [mkPayment("s", 1)], empty, null, 8)).toBe(2); });
  it("one payment covers only one of two overdue cycles (18-8=10)", () => { expect(uncoveredCount(18, [mkPayment("s", 1)], empty, null, 8)).toBe(10); });
  it("two payments cover two cycles (18-16=2)", () => {
    expect(uncoveredCount(18, [mkPayment("s", 1), mkPayment("s", 2)], empty, null, 8)).toBe(2);
  });
  it("partial amount covers proportionally (10-min(8,4)=6)", () => {
    const plan = mkPlan("pl", 800);
    expect(uncoveredCount(10, [mkPayment("s", 1, 400, "pl")], new Map([["pl", plan]]), plan, 8)).toBe(6);
  });
  it("advance is remembered when cycles complete (3→3, then 20-16=4)", () => {
    const ps = [mkPayment("s", 1), mkPayment("s", 2)];
    expect(uncoveredCount(3, ps, empty, null, 8)).toBe(3);
    expect(uncoveredCount(20, ps, empty, null, 8)).toBe(4);
  });
  it("applies offset before covering", () => {
    expect(uncoveredCount(1, [], empty, null, 8, 2)).toBe(3);
    expect(uncoveredCount(1, [], empty, null, 8, -5)).toBe(0);
  });
});
describe("pricePerSession", () => {
  it("rounds", () => {
    expect(pricePerSession(mkPlan("p", 800), 8)).toBe(100);
    expect(pricePerSession(mkPlan("p", 1000), 8)).toBe(125);
    expect(pricePerSession(mkPlan("p", 100), 3)).toBe(33);
  });
  it("null when no plan", () => { expect(pricePerSession(null, 8)).toBeNull(); });
});
describe("statusForCount", () => {
  it("ok/warning/due", () => {
    expect(statusForCount(5, 8, 6)).toBe("ok");
    expect(statusForCount(6, 8, 6)).toBe("warning");
    expect(statusForCount(7, 8, 6)).toBe("warning");
    expect(statusForCount(8, 8, 6)).toBe("due");
    expect(statusForCount(9, 8, 6)).toBe("due");
  });
});
describe("deriveCycle", () => {
  it("covers wrap and overdue", () => {
    const cases: Array<[number, number, number, number, boolean, string]> = [
      [0, 0, 8, 0, false, "ok"],
      [8, 8, 0, 1, true, "due"],
      [9, 1, 7, 1, true, "due"],
      [16, 8, 0, 2, true, "due"],
      [6, 6, 2, 0, false, "warning"],
    ];
    for (const [raw, disp, rem, cyc, over, st] of cases) {
      const d = deriveCycle(raw, 8, 6);
      expect(d.displayCount).toBe(disp);
      expect(d.remainingSessions).toBe(rem);
      expect(d.cyclesOverdue).toBe(cyc);
      expect(d.isOverdue).toBe(over);
      expect(d.status).toBe(st);
      expect(d.showPaid).toBe(false);
    }
  });
  it("shows 8/8 paid when raw 0 with hasPaid", () => {
    const d = deriveCycle(0, 8, 6, true);
    expect(d.displayCount).toBe(8);
    expect(d.remainingSessions).toBe(0);
    expect(d.cyclesOverdue).toBe(0);
    expect(d.isOverdue).toBe(false);
    expect(d.showPaid).toBe(true);
    expect(d.status).toBe("ok");
  });
  it("raw 1 with hasPaid is normal 1/8 without paid badge", () => {
    const d = deriveCycle(1, 8, 6, true);
    expect(d.displayCount).toBe(1);
    expect(d.showPaid).toBe(false);
    expect(d.remainingSessions).toBe(7);
  });
});
describe("buildSessionDues", () => {
  it("builds rows sorted due>warning>ok and respects price", () => {
    const s1 = mkStudent("s1", "Ahmed", "pl1"), s2 = mkStudent("s2", "Mona", "pl1"), s3 = mkStudent("s3", "Ziad", "pl1");
    const plan = mkPlan("pl1", 800);
    const attsMap = new Map<string, number>([["s1", atts(8)], ["s2", atts(6)], ["s3", atts(2)]]);
    const rows = buildSessionDues([s1, s2, s3], new Map(), attsMap, new Map([["pl1", plan]]), new Map(), 8, 6);
    expect(rows[0].student.id).toBe("s1"); expect(rows[0].status).toBe("due"); expect(rows[0].pricePerSession).toBe(100); expect(rows[0].remainingAmount).toBe(0);
    expect(rows[1].status).toBe("warning"); expect(rows[2].status).toBe("ok");
  });
  it("handles no plan", () => {
    const s = mkStudent("s1", "NoPlan", null);
    expect(buildSessionDues([s], new Map(), new Map([["s1", 1]]), new Map(), new Map(), 8, 6)[0].pricePerSession).toBeNull();
  });
  it("applies sessionOffset to count", () => {
    const s = mkStudent("s1", "Offset", null, 2);
    const r = buildSessionDues([s], new Map(), new Map([["s1", 1]]), new Map(), new Map(), 8, 6)[0];
    expect(r.count).toBe(3); expect(r.rawCount).toBe(3); expect(r.status).toBe("ok");
  });
  it("clamps negative offset to zero", () => {
    const s = mkStudent("s1", "Neg", null, -5);
    const r = buildSessionDues([s], new Map(), new Map([["s1", 1]]), new Map(), new Map(), 8, 6)[0];
    expect(r.count).toBe(0); expect(r.rawCount).toBe(0);
  });
  it("offset can push to due", () => {
    const s = mkStudent("s1", "DueViaOffset", null, 7);
    const r = buildSessionDues([s], new Map(), new Map([["s1", 1]]), new Map(), new Map(), 8, 6)[0];
    expect(r.count).toBe(8); expect(r.rawCount).toBe(8); expect(r.status).toBe("due"); expect(r.isOverdue).toBe(true);
  });
  it("wraps 9 sessions to 1/8 with unpaid badge", () => {
    const s = mkStudent("s1", "Wrap", null);
    const r = buildSessionDues([s], new Map(), new Map([["s1", atts(9)]]), new Map(), new Map(), 8, 6)[0];
    expect(r.rawCount).toBe(9); expect(r.count).toBe(1); expect(r.remainingSessions).toBe(7); expect(r.cyclesOverdue).toBe(1); expect(r.isOverdue).toBe(true); expect(r.status).toBe("due");
  });
  it("overdue payment carries over: 10 attendances + 1 cycle → 2/8 ok", () => {
    const s = mkStudent("s1", "Carry", null), p = mkPayment("s1", Date.parse("2026-08-05T10:00:00"));
    const r = buildSessionDues([s], new Map([["s1", [p]]]), new Map([["s1", atts(10)]]), new Map(), new Map(), 8, 6)[0];
    expect(r.rawCount).toBe(2); expect(r.count).toBe(2); expect(r.isOverdue).toBe(false); expect(r.showPaid).toBe(false); expect(r.status).toBe("ok");
  });
  it("early payment preserves balance: 2 attendances + payment stays 2/8", () => {
    const s = mkStudent("s1", "Early", null), p = mkPayment("s1", Date.parse("2026-08-30T10:00:00"));
    const r = buildSessionDues([s], new Map([["s1", [p]]]), new Map([["s1", atts(2)]]), new Map(), new Map(), 8, 6)[0];
    expect(r.rawCount).toBe(2); expect(r.count).toBe(2); expect(r.showPaid).toBe(false); expect(r.status).toBe("ok");
  });
  it("exact cycle payment shows 8/8 paid", () => {
    const s = mkStudent("s1", "Exact", null), p = mkPayment("s1", Date.parse("2026-08-30T10:00:00"));
    const r = buildSessionDues([s], new Map([["s1", [p]]]), new Map([["s1", atts(8)]]), new Map(), new Map(), 8, 6)[0];
    expect(r.rawCount).toBe(0); expect(r.count).toBe(8); expect(r.showPaid).toBe(true); expect(r.status).toBe("ok");
  });
  it("partial amount covers proportionally: 10 + half cycle → 6/8 warning", () => {
    const s = mkStudent("s1", "Half", "pl1"), plan = mkPlan("pl1", 800);
    const p = mkPayment("s1", Date.parse("2026-08-05T10:00:00"), 400, "pl1");
    const r = buildSessionDues([s], new Map([["s1", [p]]]), new Map([["s1", atts(10)]]), new Map([["pl1", plan]]), new Map(), 8, 6)[0];
    expect(r.rawCount).toBe(6); expect(r.count).toBe(6); expect(r.isOverdue).toBe(false); expect(r.status).toBe("warning");
  });
  it("no payment with zero count stays 0/8 not paid", () => {
    const s = mkStudent("s1", "NoPayZero", null);
    const r = buildSessionDues([s], new Map(), new Map(), new Map(), new Map(), 8, 6)[0];
    expect(r.rawCount).toBe(0); expect(r.count).toBe(0); expect(r.showPaid).toBe(false);
  });
});
