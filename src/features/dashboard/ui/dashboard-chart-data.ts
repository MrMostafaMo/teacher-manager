export const ATTENDANCE_COLORS = {
  present: "var(--chart-2)",
  late: "var(--chart-3)",
  absent: "var(--chart-4)",
  excused: "var(--chart-5)",
};
export const HOMEWORK_COLORS = {
  submitted: "var(--chart-2)",
  pending: "var(--muted-foreground)",
  late: "var(--chart-3)",
};
export const HOMEWORK_STATUS_KEYS = {
  submitted: "homework.statusSubmitted",
  pending: "homework.statusPending",
  late: "homework.statusLate",
} as const;

export type AttendancePoint = {
  month: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
};
export type FinancePoint = { month: string; collected: number; expenses: number; net: number };
export type HomeworkSlice = { key: string; value: number; fill: string; label: string };

export function monthShort(iso: string): string {
  const [y, m] = iso.split("-");
  return `${m}/${y.slice(2)}`;
}
