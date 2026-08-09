import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  attendance,
  examResults,
  exams,
  expenses,
  payments,
  skills,
  studentGroups,
  studentSkills,
  students,
  studyGroups,
  type Exam,
  type Expense,
  type Payment,
  type Skill,
  type Student,
} from "@/lib/db/schema";
import dayjs from "dayjs";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { studentStatement } from "@/features/payments/application/payment-cases";
import type { ReportData, ReportKey } from "@/features/reports/domain";
import { formatDateString } from "@/lib/utils/format";
import { effectiveDate, enrolledBy } from "@/lib/utils/enrollment";

/**
 * Report data builders. Every report is a flat table over current DB state;
 * the rows are strings/numbers so Excel and PDF exporters share one shape.
 * Queries live here (read-only aggregates) rather than a repository because
 * each report crosses tables.
 */
export type ReportTranslations = {
  title: string;
  headers: string[];
  status: (s: string) => string;
  /** Expense category name (localized). */
  category?: (c: string) => string;
};

export async function buildReportData(
  key: ReportKey,
  t: ReportTranslations,
): Promise<ReportData> {
  switch (key) {
    case "students":
      return studentsReport(t);
    case "attendance":
      return attendanceReport(t);
    case "exams":
      return examsReport(t);
    case "payments":
      return paymentsReport(t);
    case "expenses":
      return expensesReport(t);
    case "finances":
      return financesReport(t);
    case "skills":
      return skillsReport(t);
    case "statement":
      // The student statement is scoped to a single student; use
      // buildStudentStatementReport(studentId, t) instead.
      throw new Error("statement report requires a student id");
  }
}

async function studentsReport(t: ReportTranslations): Promise<ReportData> {
  const [rows, groups, memberships, allPlans] = await Promise.all([
    db.select().from(students).orderBy(students.name),
    db.select().from(studyGroups).orderBy(studyGroups.name),
    db.select().from(studentGroups),
    planRepository.list(),
  ]);
  const groupName = new Map((groups as typeof studyGroups.$inferSelect[]).map((g) => [g.id, g.name]));
  const planById = new Map(allPlans.map((p) => [p.id, p.name]));
  const studentGroupsMap = new Map<string, string[]>();
  for (const m of memberships) {
    const g = groupName.get(m.groupId);
    if (g) studentGroupsMap.set(m.studentId, [...(studentGroupsMap.get(m.studentId) ?? []), g]);
  }
  return {
    key: "students",
    title: t.title,
    headers: [
      t.headers[0], // name
      t.headers[1], // phone
      t.headers[2], // guardian
      t.headers[3], // plan
      t.headers[4], // groups
      t.headers[5], // status
    ],
    rows: (rows as Student[]).map((s) => [
      s.name,
      s.phone ?? "—",
      s.guardianName ?? "—",
      s.planId ? (planById.get(s.planId) ?? "—") : "—",
      (studentGroupsMap.get(s.id) ?? []).join("، "),
      t.status(s.status),
    ]),
  };
}

async function attendanceReport(t: ReportTranslations): Promise<ReportData> {
  const rows = (await db.select().from(attendance)) as typeof attendance.$inferSelect[];
  const perStudent = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  for (const r of rows) {
    const cur = perStudent.get(r.studentId) ?? { present: 0, absent: 0, late: 0, excused: 0 };
    if (r.status === "present") cur.present++;
    else if (r.status === "absent") cur.absent++;
    else if (r.status === "late") cur.late++;
    else cur.excused++;
    perStudent.set(r.studentId, cur);
  }
  const allStudents = (await db
    .select({ id: students.id, name: students.name, enrolledOn: students.enrolledOn })
    .from(students)
    .orderBy(students.name)) as Array<{ id: string; name: string; enrolledOn: string | null }>;
  const today = dayjs().format("YYYY-MM-DD");
  return {
    key: "attendance",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3], t.headers[4], t.headers[5]],
    rows: allStudents
      .filter((s) => enrolledBy(s, today))
      .map((s) => {
        const c = perStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, excused: 0 };
        return [s.name, c.present, c.absent, c.late, c.excused, c.present + c.absent + c.late + c.excused];
      }),
  };
}

async function examsReport(t: ReportTranslations): Promise<ReportData> {
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

async function paymentsReport(t: ReportTranslations): Promise<ReportData> {
  const [allPayments, allPlans, allStudents] = await Promise.all([
    db.select().from(payments),
    planRepository.list(),
    db
      .select({
        id: students.id,
        name: students.name,
        planId: students.planId,
        enrolledOn: students.enrolledOn,
      })
      .from(students)
      .orderBy(students.name),
  ]);
  const planAmount = new Map(allPlans.map((p) => [p.id, p.amount]));
  // Due amount comes from the student's *current* plan, paid is the sum of
  // every payment — never from a payment row's historical planId.
  const paidByStudent = new Map<string, number>();
  for (const p of allPayments as Payment[]) {
    paidByStudent.set(p.studentId, (paidByStudent.get(p.studentId) ?? 0) + p.amount);
  }
  const today = dayjs().format("YYYY-MM-DD");
  return {
    key: "payments",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3]],
    rows: allStudents
      .filter((s) => enrolledBy(s, today))
      .map((s) => {
        const due = s.planId ? (planAmount.get(s.planId) ?? 0) : 0;
        const paid = paidByStudent.get(s.id) ?? 0;
        return [s.name, due, paid, Math.max(due - paid, 0)];
      }),
  };
}

async function expensesReport(t: ReportTranslations): Promise<ReportData> {
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

async function financesReport(t: ReportTranslations): Promise<ReportData> {
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

async function skillsReport(t: ReportTranslations): Promise<ReportData> {
  const [skillsRows, skillLevels] = await Promise.all([
    db.select().from(skills).orderBy(skills.name),
    db.select().from(studentSkills),
  ]);
  const skillName = new Map((skillsRows as Skill[]).map((s) => [s.id, s.name]));
  const perStudent = new Map<string, { tracked: number; weak: number; weakList: string[] }>();
  for (const sl of skillLevels) {
    const name = skillName.get(sl.skillId);
    if (!name || sl.level === null) continue;
    const cur = perStudent.get(sl.studentId) ?? { tracked: 0, weak: 0, weakList: [] };
    cur.tracked++;
    if (sl.level <= 2) {
      cur.weak++;
      cur.weakList.push(`${name} (${sl.level})`);
    }
    perStudent.set(sl.studentId, cur);
  }
  const allStudents = (await db
    .select({ id: students.id, name: students.name, enrolledOn: students.enrolledOn })
    .from(students)
    .orderBy(students.name)) as Array<{ id: string; name: string; enrolledOn: string | null }>;
  const today = dayjs().format("YYYY-MM-DD");
  return {
    key: "skills",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3]],
    rows: allStudents
      .filter((s) => enrolledBy(s, today))
      .map((s) => {
        const c = perStudent.get(s.id) ?? { tracked: 0, weak: 0, weakList: [] };
        return [s.name, c.tracked, c.weak, c.weakList.join("، ") || "—"];
      }),
  };
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
