import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  examResults,
  exams,
  expenses,
  payments,
  studentGroups,
  students,
  studyGroups,
  type Exam,
  type Expense,
  type Payment,
  type Student,
} from "@/lib/db/schema";
import dayjs from "dayjs";
import type { ReportData } from "@/features/reports/domain";
import { formatDateString } from "@/lib/utils/format";
import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";
import type { ReportTranslations } from "./report-builders";

export async function examsReport(t: ReportTranslations): Promise<ReportData> {
  const [examsRows, results, groupsRows, memberships, allStudents] = await Promise.all([
    db.select().from(exams).orderBy(desc(exams.createdAt)),
    db.select().from(examResults),
    db.select().from(studyGroups),
    db
      .select({
        groupId: studentGroups.groupId,
        studentId: studentGroups.studentId,
        enrolledOn: students.enrolledOn,
      })
      .from(studentGroups)
      .innerJoin(students, eq(studentGroups.studentId, students.id)),
    db.select().from(students),
  ]);
  const groupName = new Map((groupsRows as typeof studyGroups.$inferSelect[]).map((g) => [g.id, g.name]));
  const resultsByExam = new Map<string, typeof examResults.$inferSelect[]>();
  for (const r of results) {
    resultsByExam.set(r.examId, [...(resultsByExam.get(r.examId) ?? []), r]);
  }
  const membersOf = new Map<string, Array<{ studentId: string; enrolledOn: string | null }>>();
  for (const m of memberships) {
    const arr = membersOf.get(m.groupId) ?? [];
    arr.push({ studentId: m.studentId, enrolledOn: m.enrolledOn });
    membersOf.set(m.groupId, arr);
  }
  const names = new Map((allStudents as Student[]).map((s) => [s.id, s.name]));

  const rows: (string | number)[][] = [];
  for (const e of examsRows as Exam[]) {
    const refDate = effectiveDate(e.date, e.createdAt);
    const eligibleIds = new Set(
      (membersOf.get(e.groupId) ?? []).filter((m) => enrolledBy(m, refDate)).map((m) => m.studentId),
    );
    const rs = (resultsByExam.get(e.id) ?? []).filter((r) => eligibleIds.has(r.studentId));
    const scores = rs.map((r) => r.score);
    const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
    const total = eligibleIds.size;
    const passMark = Math.ceil(e.maxScore / 2);
    const pass = scores.length ? Math.round((scores.filter((s) => s >= passMark).length / scores.length) * 100) : null;
    rows.push([
      e.title,
      groupName.get(e.groupId) ?? "—",
      formatDateString(e.date),
      e.maxScore,
      total ? Math.round((rs.length / total) * 100) : 0,
      avg ?? "—",
      pass ?? "—",
    ]);
    for (const r of rs.sort((a, b) => a.score - b.score)) {
      rows.push(["   " + (names.get(r.studentId) ?? "—"), "", "", "", "", r.score, ""]);
    }
  }
  return {
    key: "exams",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3], t.headers[4], t.headers[5], t.headers[6]],
    rows,
  };
}

export async function expensesReport(t: ReportTranslations): Promise<ReportData> {
  const rows = (await db
    .select()
    .from(expenses)
    .orderBy(desc(expenses.spentAt))) as Expense[];
  return {
    key: "expenses",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3], t.headers[4]],
    rows: rows.map((e) => [
      dayjs(e.spentAt).format("DD-MM-YYYY"),
      e.title,
      t.category?.(e.category) ?? e.category,
      e.amount,
      e.note ?? "—",
    ]),
  };
}

export async function financesReport(t: ReportTranslations): Promise<ReportData> {
  const [allPayments, allExpenses] = await Promise.all([
    db.select().from(payments),
    db.select().from(expenses),
  ]);
  const byMonth = new Map<string, { collected: number; expenses: number }>();
  for (const p of allPayments as Payment[]) {
    if (!p.period) continue;
    const m = byMonth.get(p.period) ?? { collected: 0, expenses: 0 };
    m.collected += p.amount;
    byMonth.set(p.period, m);
  }
  for (const e of allExpenses as Expense[]) {
    const month = dayjs(e.spentAt).format("YYYY-MM");
    const m = byMonth.get(month) ?? { collected: 0, expenses: 0 };
    m.expenses += e.amount;
    byMonth.set(month, m);
  }
  return {
    key: "finances",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3]],
    rows: [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, { collected, expenses }]) => [
        dayjs(`${month}-01`).format("MM-YYYY"),
        collected,
        expenses,
        collected - expenses,
      ]),
  };
}
