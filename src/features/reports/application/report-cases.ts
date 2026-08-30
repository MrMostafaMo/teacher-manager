import dayjs from "dayjs";
import { studentStatement } from "@/features/payments/application/payment-cases";
import type { ReportData, ReportKey } from "@/features/reports/domain";
import {
  attendanceReport,
  paymentsReport,
  skillsReport,
  studentsReport,
  type ReportTranslations,
} from "./report-builders";
import { examsReport, expensesReport, financesReport } from "./report-financials";
import { weakPointsReport } from "./report-weak-points";
import { homeworkReport, sessionAttendanceReport } from "./report-academic";

export type { ReportTranslations } from "./report-builders";

/**
 * Report data builder. Every report is a flat table over current DB state;
 * the rows are strings/numbers so Excel and PDF exporters share one shape.
 * Queries live here (read-only aggregates) rather than a repository because
 * each report crosses tables.
 */
export async function buildReportData(
  key: ReportKey,
  t: ReportTranslations,
  period?: string
): Promise<ReportData> {
  switch (key) {
    case "students":
      return studentsReport(t);
    case "attendance":
      return attendanceReport(t, period);
    case "exams":
      return examsReport(t, period);
    case "payments":
      return paymentsReport(t, period);
    case "expenses":
      return expensesReport(t, period);
    case "finances":
      return financesReport(t, period);
    case "skills":
      return skillsReport(t);
    case "weakPoints":
      return weakPointsReport(t);
    case "homework":
      return homeworkReport(t, period);
    case "sessionAttendance":
      return sessionAttendanceReport(t, period);
    case "statement":
      throw new Error("statement report requires a student id");
  }
}

export type StatementTranslations = {
  title: string;
  /** [date, description, amount, balance] */
  headers: string[];
  monthDues: string;
  total: string;
  method: (m: string) => string;
};

/**
 * Student statement as a chronological ledger: each month's dues entry is
 * followed by that month's payments, all with a running balance. Amounts are
 * the final column's net (total due − total paid) in the closing row.
 */
export async function buildStudentStatementReport(
  studentId: string,
  t: StatementTranslations,
): Promise<ReportData> {
  const st = await studentStatement(studentId);
  const paidIn = new Map<string, typeof st.payments>();
  for (const p of st.payments) {
    const period = p.payment.period ?? "";
    const arr = paidIn.get(period) ?? [];
    arr.push(p);
    paidIn.set(period, arr);
  }

  const rows: (string | number)[][] = [];
  let running = 0;
  for (const m of st.months) {
    running += m.due;
    rows.push([m.period.split("-").reverse().join("-"), t.monthDues, m.due, running]);
    for (const p of paidIn.get(m.period) ?? []) {
      running -= p.payment.amount;
      rows.push([
        dayjs(p.payment.paidAt).format("DD-MM-YYYY"),
        t.method(p.payment.method),
        p.payment.amount,
        running,
      ]);
    }
  }
  // Payments recorded outside the billed range (missing/other period).
  for (const p of st.payments) {
    const period = p.payment.period ?? "";
    if (st.months.some((m) => m.period === period)) continue;
    running -= p.payment.amount;
    rows.push([
      dayjs(p.payment.paidAt).format("DD-MM-YYYY"),
      t.method(p.payment.method),
      p.payment.amount,
      running,
    ]);
  }
  rows.push([t.total, "", st.totalPaid, st.totalBalance]);

  return {
    key: "statement",
    title: t.title,
    headers: t.headers,
    rows,
  };
}
