import { describe, expect, it } from "vitest";
import type { Expense } from "@/lib/db/schema";
import { categoryTotals } from "./expense-stats";

const row = (category: Expense["category"], amount: number): Expense => ({
  id: category + amount,
  title: "x",
  category,
  amount,
  note: null,
  spentAt: 0,
  createdAt: 0,
  updatedAt: 0,
});

describe("categoryTotals", () => {
  it("sums amounts per category", () => {
    const totals = categoryTotals([
      row("prizes", 150),
      row("other", 40),
      row("prizes", 50),
      row("utilities", 300),
    ]);
    expect(totals).toEqual([
      { category: "utilities", total: 300 },
      { category: "prizes", total: 200 },
      { category: "other", total: 40 },
    ]);
  });

  it("orders by total desc, ties alphabetically", () => {
    const totals = categoryTotals([row("prizes", 100), row("other", 100)]);
    expect(totals.map((t) => t.category)).toEqual(["other", "prizes"]);
  });

  it("returns an empty array for no expenses", () => {
    expect(categoryTotals([])).toEqual([]);
  });

  it("does not emit categories with no rows", () => {
    const totals = categoryTotals([row("maintenance", 10)]);
    expect(totals).toHaveLength(1);
  });
});