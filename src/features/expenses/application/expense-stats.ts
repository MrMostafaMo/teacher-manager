import type { Expense } from "@/lib/db/schema";

/** Per-category totals of the visible expenses (used by the category chart). */
export interface CategoryTotal {
  category: Expense["category"];
  total: number;
}

/**
 * Sum expense amounts per category, highest total first (ties broken
 * alphabetically for a stable order). Pure and UI-free.
 */
export function categoryTotals(rows: Expense[]): CategoryTotal[] {
  const totals = new Map<Expense["category"], number>();
  for (const r of rows) totals.set(r.category, (totals.get(r.category) ?? 0) + r.amount);
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total || a.category.localeCompare(b.category));
}
