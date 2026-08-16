/** Shared month-key math: ISO `YYYY-MM` strings, no date libraries needed. */

/** The current month as an ISO key. */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** ISO month key `delta` months before/after the given one. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** ISO month keys for the last `n` months ending at `endMonth`, oldest first. */
export function lastMonths(n: number, endMonth: string): string[] {
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(shiftMonth(endMonth, -i));
  }
  return months;
}

/** [start, end) unix-ms window for an ISO YYYY-MM month. */
export function monthWindow(month: string): { start: number; end: number } {
  const prefix = month.slice(0, 7);
  const start = Date.parse(`${prefix}-01T00:00:00`);
  const d = new Date(start);
  d.setMonth(d.getMonth() + 1);
  return { start, end: d.getTime() };
}
