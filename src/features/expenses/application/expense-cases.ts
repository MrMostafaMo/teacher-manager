import { expenseInputSchema, type ExpenseInput } from "@/features/expenses/domain";
import { expenseRepository } from "@/features/expenses/infrastructure/expense-repo";
import { logActivity } from "@/lib/activity-log";
import { expenses, type Expense } from "@/lib/db/schema";
import { captureRows, restoreRows } from "@/lib/db/snapshot";
import { registerUndo } from "@/lib/undo-store";
import { uuid } from "@/lib/utils/uuid";

/**
 * Expenses use-cases. Validate input, write through the repository, and
 * record each mutation in the activity log.
 */

export async function recordExpense(input: ExpenseInput): Promise<Expense> {
  const parsed = expenseInputSchema.parse(input);
  const row = await expenseRepository.insert({ id: uuid(), ...parsed });
  await logActivity({
    action: "expense.create",
    entityType: "expense",
    entityId: row.id,
    details: { title: row.title, amount: row.amount, category: row.category },
  });
  return row;
}

export async function deleteExpense(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const rows = options.undo === false ? [] : await captureRows(expenses, [id]);
  const removed = await expenseRepository.remove(id);
  if (!removed) throw new Error(`expense ${id} not found`);
  await logActivity({ action: "expense.delete", entityType: "expense", entityId: id });
  if (options.undo === false) return null;
  return registerUndo(() => restoreRows(expenses, rows));
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  const parsed = expenseInputSchema.parse(input);
  const row = await expenseRepository.update(id, parsed);
  if (!row) throw new Error(`expense ${id} not found`);
  await logActivity({
    action: "expense.update",
    entityType: "expense",
    entityId: id,
    details: { title: row.title, amount: row.amount, category: row.category },
  });
  return row;
}

/** Expenses spent inside the given ISO month (YYYY-MM), newest first. */
export async function listExpenses(period: string): Promise<Expense[]> {
  return expenseRepository.byMonth(period);
}

/** Total spent inside the given ISO month (YYYY-MM). */
export async function monthlyExpenseTotal(period: string): Promise<number> {
  const rows = await expenseRepository.byMonth(period);
  return rows.reduce((acc, r) => acc + r.amount, 0);
}
