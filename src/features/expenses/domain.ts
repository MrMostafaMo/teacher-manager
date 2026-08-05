import { z } from "zod";

/**
 * Expenses input schema — outgoing costs (prizes, stationery, utilities…).
 * Amounts are integers (EGP), entered via number inputs. `spentAt` is a
 * unix-ms timestamp; the UI sends it from the date picker.
 */
const optionalText = (max: number) =>
  z
    .union([z.literal(""), z.string().trim().pipe(z.string().max(max))])
    .optional()
    .transform((v) => (v ? v : undefined));

const amountSchema = z.number().int().positive().max(100_000_000);

export const expenseCategorySchema = z.enum([
  "prizes",
  "stationery",
  "utilities",
  "maintenance",
  "other",
]);

export const expenseInputSchema = z.object({
  title: z.string().trim().pipe(z.string().min(1).max(100)),
  category: expenseCategorySchema,
  amount: amountSchema,
  note: optionalText(2000),
  spentAt: z.number().int().positive(),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
