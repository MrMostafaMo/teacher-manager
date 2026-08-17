import { type PaymentInput } from "@/features/payments/domain";
import { recordPayment } from "./payment-cases";

type PaymentMethod = PaymentInput["method"];

export interface BatchEntry {
  studentId: string;
  planId: string | null;
  amount: number;
  method: PaymentMethod;
}

export async function recordBatchPayments(
  entries: BatchEntry[],
  period: string,
): Promise<number> {
  let count = 0;
  for (const entry of entries) {
    if (entry.amount <= 0) continue;
    await recordPayment({
      studentId: entry.studentId,
      planId: entry.planId ?? undefined,
      amount: entry.amount,
      period,
      method: entry.method,
      note: undefined,
    });
    count++;
  }
  return count;
}
