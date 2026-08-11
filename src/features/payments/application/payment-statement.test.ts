import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Payment, Student } from "@/lib/db/schema";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import type { PlanWithCount } from "@/features/payments/infrastructure/plan-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { studentStatement } from "./payment-statement";

vi.mock("@/features/payments/infrastructure/payment-repo", () => ({
  paymentRepository: { byStudent: vi.fn() },
}));
vi.mock("@/features/payments/infrastructure/plan-repo", () => ({
  planRepository: { list: vi.fn() },
}));
vi.mock("@/features/students/infrastructure/student-repo", () => ({
  studentRepository: { findById: vi.fn() },
}));

function student(overrides: Partial<Student> = {}): Student {
  return {
    id: "s1",
    name: "أحمد",
    phone: null,
    guardianName: null,
    guardianPhone: null,
    status: "active",
    notes: null,
    planId: null,
    enrolledOn: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "p1",
    studentId: "s1",
    planId: null,
    amount: 100,
    period: "2026-05",
    method: "cash",
    note: null,
    paidAt: 100,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function plan(overrides: Partial<PlanWithCount> = {}): PlanWithCount {
  return {
    id: "pl1",
    name: "Monthly",
    amount: 200,
    billingInterval: "monthly",
    memberCount: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("studentStatement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 10)); // May 10 2026
    vi.mocked(studentRepository.findById).mockResolvedValue(student({ planId: "pl1", enrolledOn: "2026-03-01" }));
    vi.mocked(planRepository.list).mockResolvedValue([plan()]);
    vi.mocked(paymentRepository.byStudent).mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());
  it("throws when the student is missing", async () => {
    vi.mocked(studentRepository.findById).mockResolvedValue(undefined);
    await expect(studentStatement("s1")).rejects.toThrow("student s1 not found");
  });
  it("charges the plan each month from enrollment through today", async () => {
    vi.mocked(paymentRepository.byStudent).mockResolvedValue([
      payment({ amount: 150, period: "2026-03", paidAt: 1 }),
      payment({ amount: 50, period: "2026-04", paidAt: 2 }),
    ]);
    const stmt = await studentStatement("s1");
    expect(stmt.planName).toBe("Monthly");
    expect(stmt.months.map((m) => m.period)).toEqual(["2026-03", "2026-04", "2026-05"]);
    expect(stmt.months.map((m) => m.paid)).toEqual([150, 50, 0]);
    expect(stmt.months.map((m) => m.running)).toEqual([50, 200, 400]);
    expect(stmt.totalDue).toBe(600);
    expect(stmt.totalPaid).toBe(200);
    expect(stmt.totalBalance).toBe(400);
  });

  it("goes negative (advance) when a month is overpaid", async () => {
    vi.mocked(studentRepository.findById).mockResolvedValue(student({ planId: "pl1", enrolledOn: "2026-05-01" }));
    vi.mocked(paymentRepository.byStudent).mockResolvedValue([payment({ amount: 250, period: "2026-05" })]);
    const stmt = await studentStatement("s1");
    expect(stmt.months).toHaveLength(1);
    expect(stmt.months[0].running).toBe(-50);
    expect(stmt.totalBalance).toBe(-50);
  });

  it("charges nothing and has no plan when the student has no plan", async () => {
    vi.mocked(studentRepository.findById).mockResolvedValue(student());
    const stmt = await studentStatement("s1");
    expect(stmt.planName).toBeNull();
    expect(stmt.months[0].due).toBe(0);
    expect(stmt.totalDue).toBe(0);
  });

  it("starts from the first paid period when enrollment is unknown", async () => {
    vi.mocked(studentRepository.findById).mockResolvedValue(student({ planId: "pl1" }));
    vi.mocked(paymentRepository.byStudent).mockResolvedValue([
      payment({ amount: 100, period: "2026-04", paidAt: 2 }),
    ]);
    const stmt = await studentStatement("s1");
    expect(stmt.months[0].period).toBe("2026-04");
  });

  it("extends the statement into future paid periods", async () => {
    vi.mocked(studentRepository.findById).mockResolvedValue(student({ planId: "pl1", enrolledOn: "2026-01-01" }));
    vi.mocked(paymentRepository.byStudent).mockResolvedValue([
      payment({ amount: 200, period: "2026-07", paidAt: 3 }),
    ]);
    const stmt = await studentStatement("s1");
    expect(stmt.months.map((m) => m.period)).toEqual(
      ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"],
    );
  });

  it("builds a chronological ledger with the running paid total", async () => {
    vi.mocked(paymentRepository.byStudent).mockResolvedValue([
      payment({ id: "p1", amount: 100, period: "2026-03", paidAt: 1 }),
      payment({ id: "p2", amount: 50, period: "2026-03", paidAt: 5 }),
    ]);
    const stmt = await studentStatement("s1");
    expect(stmt.payments.map((p) => p.payment.id)).toEqual(["p1", "p2"]);
    expect(stmt.payments.map((p) => p.cumulativePaid)).toEqual([100, 150]);
  });

  it("ignores payments without a period for month billing but keeps them in totals", async () => {
    vi.mocked(paymentRepository.byStudent).mockResolvedValue([
      payment({ id: "p1", amount: 100, period: null, paidAt: 1 }),
    ]);
    const stmt = await studentStatement("s1");
    expect(stmt.months.every((m) => m.paid === 0)).toBe(true);
    expect(stmt.totalPaid).toBe(100);
    expect(stmt.payments).toHaveLength(1);
  });
});
