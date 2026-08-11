import type { PaymentHistoryRow } from "@/features/payments/application/payment-cases";

export interface HistorySection {
  id: string;
  name: string;
  list: PaymentHistoryRow[];
}

export interface HistoryGrouping {
  sections: HistorySection[];
  ungrouped: PaymentHistoryRow[];
}

/** Bucket payment-history rows by the student's groups; no-group rows go ungrouped. */
export function groupPaymentHistory(
  rows: PaymentHistoryRow[],
  groupsByStudent: Map<string, Array<{ id: string; name: string }>>,
): HistoryGrouping {
  const byGroup = new Map<string, HistorySection>();
  const ungrouped: PaymentHistoryRow[] = [];
  for (const row of rows) {
    const groups = groupsByStudent.get(row.payment.studentId) ?? [];
    if (groups.length === 0) {
      ungrouped.push(row);
      continue;
    }
    for (const g of groups) {
      let sec = byGroup.get(g.id);
      if (!sec) {
        sec = { id: g.id, name: g.name, list: [] };
        byGroup.set(g.id, sec);
      }
      sec.list.push(row);
    }
  }
  const sections = [...byGroup.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  return { sections, ungrouped };
}

export function sectionTotal(list: PaymentHistoryRow[]): number {
  return list.reduce((acc, r) => acc + r.payment.amount, 0);
}
