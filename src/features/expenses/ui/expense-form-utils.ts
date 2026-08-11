import dayjs from "dayjs";
import { expenseCategorySchema } from "@/features/expenses/domain";
import type { Expense } from "@/lib/db/schema";

export interface ExpenseFormState {
  title: string;
  category: string;
  amount: string;
  date: string;
  note: string;
}

export function emptyExpenseForm(): ExpenseFormState {
  return {
    title: "",
    category: "other",
    amount: "",
    date: dayjs().format("YYYY-MM-DD"),
    note: "",
  };
}

export function expenseFormFromExpense(expense: Expense): ExpenseFormState {
  return {
    title: expense.title,
    category: expense.category,
    amount: String(expense.amount),
    date: dayjs(expense.spentAt).format("YYYY-MM-DD"),
    note: expense.note ?? "",
  };
}

export function expenseInputFromForm(form: ExpenseFormState) {
  return {
    title: form.title,
    category: expenseCategorySchema.parse(form.category),
    amount: Number(form.amount),
    note: form.note,
    spentAt: dayjs(form.date).startOf("day").valueOf(),
  };
}
