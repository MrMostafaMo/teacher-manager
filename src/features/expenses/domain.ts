import { z } from "zod";
import { amountSchema, nameSchema, optionalText } from "@/lib/validation";

/**
 * Expenses input schema — outgoing costs (prizes, stationery, utilities…).
 * Amounts are integers (EGP), entered via number inputs. `spentAt` is a
 * unix-ms timestamp; the UI sends it from the date picker.
 */
export const expenseCategorySchema = z.enum([
  "prizes",
  "stationery",
  "utilities",
  "maintenance",
  "other",
]);

export const expenseInputSchema = z.object({
  title: nameSchema,
  category: expenseCategorySchema,
  amount: amountSchema,
  note: optionalText(2000),
  spentAt: z.number().int().positive(),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
