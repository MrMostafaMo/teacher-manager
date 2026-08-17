import type { Plan, Student } from "@/lib/db/schema";

export type PaymentMethod = "cash" | "card" | "transfer";

export interface BatchRow {
  studentId: string;
  name: string;
  planId: string | null;
  planName: string;
  amount: number;
  method: PaymentMethod;
  checked: boolean;
}

export function buildBatchRows(students: Student[], plans: Plan[]): BatchRow[] {
  const planById = new Map(plans.map((p) => [p.id, p]));
  return students.map((s) => {
    const plan = s.planId ? planById.get(s.planId) : undefined;
    return {
      studentId: s.id,
      name: s.name,
      planId: plan?.id ?? null,
      planName: plan?.name ?? "",
      amount: plan?.amount ?? 0,
      method: "cash" as const,
      checked: !!plan,
    };
  });
}
