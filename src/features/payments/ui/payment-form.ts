import { ZodError } from "zod";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import type { Payment } from "@/lib/db/schema";

export interface PaymentFormState {
  studentId: string;
  planId: string;
  amount: string;
  period: string;
  method: "cash" | "card" | "transfer";
  note: string;
}

export function emptyPaymentForm(period: string): PaymentFormState {
  return { studentId: "", planId: "", amount: "", period, method: "cash", note: "" };
}

export function paymentFormFromPayment(payment: Payment): PaymentFormState {
  return {
    studentId: payment.studentId,
    planId: payment.planId ?? "",
    amount: String(payment.amount),
    period: payment.period ?? "",
    method: payment.method ?? "cash",
    note: payment.note ?? "",
  };
}

export function paymentFormErrors(
  t: (key: string) => string,
  error: ZodError,
): Record<string, string> {
  return mapZodErrors(error, (field) =>
    field === "amount"
      ? t("payments.errors.amountInvalid")
      : field === "studentId"
        ? t("payments.errors.studentRequired")
        : field === "period"
          ? t("payments.errors.periodInvalid")
          : t("payments.errors.invalid"),
  );
}
