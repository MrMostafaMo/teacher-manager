import { describe, it, expect } from "vitest";
import { countSince, deriveCycle, pricePerSession, statusForCount, buildSessionDues } from "./session-dues";
import type { Payment, Plan, Student } from "@/lib/db/schema";
function mkStudent(id: string, name: string, planId: string | null = null, offset = 0): Student {
  return { id, name, planId, status: "active", phone: null, guardianName: null, guardianPhone: null, notes: null, enrolledOn: "2026-01-01", birthDate: null, gradeLevel: null, photoUrl: null, sessionOffset: offset, createdAt: 0, updatedAt: 0 } as unknown as Student;
}
function mkPlan(id: string, amount: number): Plan {
  return { id, name: "plan", amount, billingInterval: "monthly", createdAt: 0, updatedAt: 0 } as Plan;
}
function mkPayment(studentId: string, paidAt: number, amount = 800): Payment {
  return { id: `p-${paidAt}`, studentId, planId: null, amount, period: "2026-08", method: "cash", note: null, paidAt, createdAt: 0, updatedAt: 0 } as Payment;
}
describe("countSince", () => {
  it("counts all when no payments", () => { expect(countSince([], [{ date: "2026-08-01" }, { date: "2026-08-02" }])).toBe(2); });
  it("counts only after last paidAt", () => {
    const p = mkPayment("s1", Date.parse("2026-08-05T10:00:00"));
    expect(countSince([p], [{ date: "2026-08-04" }, { date: "2026-08-05" }, { date: "2026-08-06" }])).toBe(1);
  });
  it("uses max paidAt when multiple", () => {
    const p1 = mkPayment("s1", Date.parse("2026-08-03T00:00:00")), p2 = mkPayment("s1", Date.parse("2026-08-07T00:00:00"));
    expect(countSince([p1, p2], [{ date: "2026-08-04" }, { date: "2026-08-08" }])).toBe(1);
  });
  it("counts excused too", () => { expect(countSince([], [{ date: "2026-08-01" }])).toBe(1); });
  it("counts same-day only if createdAt after paidAt", () => {
    const p = mkPayment("s1", Date.parse("2026-08-05T10:00:00"));
    expect(countSince([p], [{ date: "2026-08-05", createdAt: Date.parse("2026-08-05T12:00:00") }])).toBe(1);
    expect(countSince([p], [{ date: "2026-08-05", createdAt: Date.parse("2026-08-05T09:00:00") }])).toBe(0);
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
    }
  });
});
describe("buildSessionDues", () => {
  it("builds rows sorted due>warning>ok and respects price", () => {
    const s1 = mkStudent("s1", "Ahmed", "pl1"), s2 = mkStudent("s2", "Mona", "pl1"), s3 = mkStudent("s3", "Ziad", "pl1");
    const plan = mkPlan("pl1", 800);
    const payments = new Map<string, Payment[]>([["s1", [mkPayment("s1", Date.parse("2026-07-01"))]], ["s2", [mkPayment("s2", Date.parse("2026-07-01"))]], ["s3", [mkPayment("s3", Date.parse("2026-07-01"))]]]);
    const atts = new Map<string, Array<{ date: string }>>([["s1", Array.from({ length: 8 }, (_, i) => ({ date: `2026-08-0${i + 1}` }))], ["s2", Array.from({ length: 6 }, (_, i) => ({ date: `2026-08-0${i + 1}` }))], ["s3", Array.from({ length: 2 }, (_, i) => ({ date: `2026-08-0${i + 1}` }))]]);
    const rows = buildSessionDues([s1, s2, s3], payments, atts, new Map([["pl1", plan]]), new Map(), 8, 6);
    expect(rows[0].student.id).toBe("s1"); expect(rows[0].status).toBe("due"); expect(rows[0].pricePerSession).toBe(100); expect(rows[0].remainingAmount).toBe(0);
    expect(rows[1].status).toBe("warning"); expect(rows[2].status).toBe("ok");
  });
  it("handles no plan", () => {
    const s = mkStudent("s1", "NoPlan", null);
    expect(buildSessionDues([s], new Map(), new Map([["s1", [{ date: "2026-08-01" }]]]), new Map(), new Map(), 8, 6)[0].pricePerSession).toBeNull();
  });
  it("applies sessionOffset to count", () => {
    const s = mkStudent("s1", "Offset", null, 2);
    const r = buildSessionDues([s], new Map(), new Map([["s1", [{ date: "2026-08-01" }]]]), new Map(), new Map(), 8, 6)[0];
    expect(r.count).toBe(3); expect(r.rawCount).toBe(3); expect(r.status).toBe("ok");
  });
  it("clamps negative offset to zero", () => {
    const s = mkStudent("s1", "Neg", null, -5);
    const r = buildSessionDues([s], new Map(), new Map([["s1", [{ date: "2026-08-01" }]]]), new Map(), new Map(), 8, 6)[0];
    expect(r.count).toBe(0); expect(r.rawCount).toBe(0);
  });
  it("offset can push to due", () => {
    const s = mkStudent("s1", "DueViaOffset", null, 7);
    const r = buildSessionDues([s], new Map(), new Map([["s1", [{ date: "2026-08-01" }]]]), new Map(), new Map(), 8, 6)[0];
    expect(r.count).toBe(8); expect(r.rawCount).toBe(8); expect(r.status).toBe("due"); expect(r.isOverdue).toBe(true);
  });
  it("wraps 9 sessions to 1/8 with unpaid badge", () => {
    const s = mkStudent("s1", "Wrap", null);
    const atts = new Map<string, Array<{ date: string }>>([["s1", Array.from({ length: 9 }, (_, i) => ({ date: `2026-08-${String(i + 1).padStart(2, "0")}` }))]]);
    const r = buildSessionDues([s], new Map(), atts, new Map(), new Map(), 8, 6)[0];
    expect(r.rawCount).toBe(9); expect(r.count).toBe(1); expect(r.remainingSessions).toBe(7); expect(r.cyclesOverdue).toBe(1); expect(r.isOverdue).toBe(true); expect(r.status).toBe("due");
  });
  it("paid resets: after payment only later attendances count", () => {
    const s = mkStudent("s1", "PaidReset", null), p = mkPayment("s1", Date.parse("2026-08-05T10:00:00"));
    const atts = new Map<string, Array<{ date: string }>>([["s1", Array.from({ length: 8 }, (_, i) => ({ date: `2026-08-${String(i + 1).padStart(2, "0")}` }))]]);
    const r = buildSessionDues([s], new Map([["s1", [p]]]), atts, new Map(), new Map(), 8, 6)[0];
    expect(r.rawCount).toBe(3); expect(r.count).toBe(3); expect(r.isOverdue).toBe(false);
  });
});
