import { z } from "zod";

/**
 * Plans + payments input schemas. `optionalText` normalizes blank inputs to
 * `undefined` so the DB stores NULL instead of "" (mirrors students/groups).
 * Amounts are integers (EGP), entered via number inputs.
 */
const optionalText = (max: number) =>
  z
    .union([z.literal(""), z.string().trim().pipe(z.string().max(max))])
    .optional()
    .transform((v) => (v ? v : undefined));

const optionalId = z
  .union([z.literal(""), z.string().min(1)])
  .optional()
  .transform((v) => (v ? v : undefined));

const amountSchema = z.number().int().positive().max(100_000_000);

export const planInputSchema = z.object({
  name: z.string().trim().pipe(z.string().min(1).max(100)),
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
