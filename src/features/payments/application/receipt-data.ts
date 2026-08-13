import type { Payment } from "@/lib/db/schema";
import type { PaymentHistoryRow } from "./payment-cases";

/**
 * Raw data backing a payment receipt. Formatting (money, dates, localized
 * method label) stays in the UI layer so this use-case stays framework-free.
 */
export interface PaymentReceiptData {
  payment: Payment;
  studentName: string;
  planName: string | null;
}

/** The history query already resolves names — just narrow to what the receipt needs. */
export function getPaymentReceiptData(row: PaymentHistoryRow): PaymentReceiptData {
  return {
    payment: row.payment,
    studentName: row.studentName,
    planName: row.planName,
  };
}
