import dayjs from "dayjs";
import type { StudentProfileData } from "./student-profile-cases";

/**
 * Per-student trend series builder. Pure function: converts the aggregate
 * `StudentProfileData` (already loaded by `getStudentProfile`) into the chart
 * series shown on the profile page. No writes, no new queries.
 */

export interface AttendanceTrendPoint {
  month: string;
  label: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  rate: number;
}

export interface ExamTrendPoint {
  date: string;
  label: string;
  score: number;
  pct: number;
}

export interface HomeworkTrendPoint {
  month: string;
  label: string;
  total: number;
  done: number;
  rate: number;
}

export interface PaymentTrendPoint {
  month: string;
  label: string;
  amount: number;
}

export interface StudentTrends {
  attendance: AttendanceTrendPoint[];
  exams: ExamTrendPoint[];
  homework: HomeworkTrendPoint[];
  payments: PaymentTrendPoint[];
}

const MAX_MONTHS = 8;
const MAX_EXAMS = 15;

function monthShort(iso: string): string {
  const [y, m] = iso.split("-");
  return `${m}/${y.slice(2)}`;
}

function rate(part: number, total: number): number {
  return total ? Math.round((part / total) * 100) : 0;
}

export function buildStudentTrends(data: StudentProfileData): StudentTrends {
  const attendance = new Map<string, AttendanceTrendPoint>();
  for (const row of data.attendanceHistory) {
    const month = row.date.slice(0, 7);
    const point =
      attendance.get(month) ??
      { month, label: monthShort(month), present: 0, late: 0, absent: 0, excused: 0, total: 0, rate: 0 };
    point.total += 1;
    if (row.status === "present") point.present += 1;
    else if (row.status === "late") point.late += 1;
    else if (row.status === "absent") point.absent += 1;
    else point.excused += 1;
    attendance.set(month, point);
  }
  const attendanceSeries = [...attendance.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-MAX_MONTHS)
    .map((p) => ({ ...p, rate: rate(p.present + p.late + p.excused, p.total) }));

  const exams = data.exams
    .map((e) => {
      const date = e.date ?? dayjs(e.createdAt).format("YYYY-MM-DD");
      const score = e.score ?? 0;
      return {
        date,
        label: date.slice(5),
        score,
        pct: e.maxScore ? Math.min(100, Math.round((score / e.maxScore) * 100)) : 0,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_EXAMS);

  const homework = new Map<string, HomeworkTrendPoint>();
  for (const row of data.homeworks) {
    const month = (row.dueDate ?? dayjs(row.createdAt).format("YYYY-MM")).slice(0, 7);
    const point =
      homework.get(month) ?? { month, label: monthShort(month), total: 0, done: 0, rate: 0 };
    point.total += 1;
    if (row.status === "submitted" || row.status === "late") point.done += 1;
    homework.set(month, point);
  }
  const homeworkSeries = [...homework.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-MAX_MONTHS)
    .map((p) => ({ ...p, rate: rate(p.done, p.total) }));

  const payments = new Map<string, PaymentTrendPoint>();
  for (const row of data.payments) {
    const month = (row.payment.period ?? dayjs(row.payment.paidAt).format("YYYY-MM")).slice(0, 7);
    const point = payments.get(month) ?? { month, label: monthShort(month), amount: 0 };
    point.amount += row.payment.amount;
    payments.set(month, point);
  }
  const paymentSeries = [...payments.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-MAX_MONTHS);

  return {
    attendance: attendanceSeries,
    exams,
    homework: homeworkSeries,
    payments: paymentSeries,
  };
}
