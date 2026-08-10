import { z } from "zod";
import { amountSchema, nameSchema, optionalId, optionalText } from "@/lib/validation";

/**
 * Plans + payments input schemas. `optionalText` normalizes blank inputs to
 * `undefined` so the DB stores NULL instead of "" (mirrors students/groups).
 * Amounts are integers (EGP), entered via number inputs.
 */
export const planInputSchema = z.object({
  name: nameSchema,
  amount: amountSchema,
  billingInterval: z.enum(["monthly", "term", "yearly"]),
});

export type PlanInput = z.infer<typeof planInputSchema>;

export const paymentInputSchema = z.object({
  studentId: z.string().min(1),
  planId: optionalId,
  amount: amountSchema,
  /** Billed ISO month (YYYY-MM), the period this payment covers. */
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "period must be a valid YYYY-MM"),
  method: z.enum(["cash", "card", "transfer"]),
  note: optionalText(2000),
});

export type PaymentInput = z.infer<typeof paymentInputSchema>;
