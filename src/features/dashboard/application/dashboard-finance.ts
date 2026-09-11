import type { DuesRow } from "@/features/payments/application/payment-cases";
import type { SessionDuesRow } from "@/features/payments/application/session-dues-cases";

export interface FinanceFigures {
  collected: number;
  outstanding: number;
  topDebtors: Array<{ id: string; name: string; remaining: number }>;
}

const sumPaid = (payments: Array<{ amount: number }>) => payments.reduce((a, p) => a + p.amount, 0);

/** Collected/outstanding/top-debtors for either billing mode (pure). */
export function financeFigures(
  billingMode: "calendar" | "sessions",
  latestPeriodPayments: Array<{ amount: number }>,
  dues: DuesRow[],
  sessionDuesRows: SessionDuesRow[],
): FinanceFigures {
  const collected = sumPaid(latestPeriodPayments);
  // ponytail: remainingAmount is remainingSessions * price (never negative),
  // so one clamped path covers both row shapes.
  const rows =
    billingMode === "sessions"
      ? sessionDuesRows
          .filter((r) => r.status === "due")
          .map((r) => ({ id: r.student.id, name: r.student.name, remaining: r.remainingAmount ?? 0 }))
      : dues.map((r) => ({ id: r.student.id, name: r.student.name, remaining: r.remaining }));
  const outstanding = rows.reduce((a, r) => a + Math.max(0, r.remaining), 0);
  const topDebtors = rows
    .filter((r) => r.remaining > 0)
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 5);
  return { collected, outstanding, topDebtors };
}

export function prevFinance(
  prevPeriodPayments: Array<{ amount: number }>,
  prevExpenses: number,
): { prevCollected: number; prevNet: number } {
  const prevCollected = sumPaid(prevPeriodPayments);
  return { prevCollected, prevNet: prevCollected - prevExpenses };
}
