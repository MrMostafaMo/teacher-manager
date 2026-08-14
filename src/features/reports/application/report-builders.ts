import { db } from "@/lib/db/client";
import {
  attendance,
  payments,
  skills,
  studentGroups,
  studentSkills,
  students,
  studyGroups,
  type Payment,
  type Skill,
  type Student,
} from "@/lib/db/schema";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import type { ReportData } from "@/features/reports/domain";
import { allEnrolledStudents, todayEnrolled } from "./report-helpers";

export type ReportTranslations = {
  title: string;
  headers: string[];
  status: (s: string) => string;
  /** Expense category name (localized). */
  category?: (c: string) => string;
  /** Weak-point status name (active/resolved, localized). */
  weakStatus?: (s: string) => string;
};

export async function studentsReport(t: ReportTranslations): Promise<ReportData> {
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
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3], t.headers[4], t.headers[5]],
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

export async function attendanceReport(t: ReportTranslations): Promise<ReportData> {
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
  return {
    key: "attendance",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3], t.headers[4], t.headers[5]],
    rows: todayEnrolled(await allEnrolledStudents()).map((s) => {
      const c = perStudent.get(s.id) ?? { present: 0, absent: 0, late: 0, excused: 0 };
      return [s.name, c.present, c.absent, c.late, c.excused, c.present + c.absent + c.late + c.excused];
    }),
  };
}

export async function paymentsReport(t: ReportTranslations): Promise<ReportData> {
  const [allPayments, allPlans, allStudents] = await Promise.all([
    db.select().from(payments),
    planRepository.list(),
    allEnrolledStudents(),
  ]);
  const planAmount = new Map(allPlans.map((p) => [p.id, p.amount]));
  // Due amount comes from the student's *current* plan, paid is the sum of
  // every payment — never from a payment row's historical planId.
  const paidByStudent = new Map<string, number>();
  for (const p of allPayments as Payment[]) {
    paidByStudent.set(p.studentId, (paidByStudent.get(p.studentId) ?? 0) + p.amount);
  }
  return {
    key: "payments",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3]],
    rows: todayEnrolled(allStudents).map((s) => {
      const due = s.planId ? (planAmount.get(s.planId) ?? 0) : 0;
      const paid = paidByStudent.get(s.id) ?? 0;
      return [s.name, due, paid, Math.max(due - paid, 0)];
    }),
  };
}

export async function skillsReport(t: ReportTranslations): Promise<ReportData> {
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
  return {
    key: "skills",
    title: t.title,
    headers: [t.headers[0], t.headers[1], t.headers[2], t.headers[3]],
    rows: todayEnrolled(await allEnrolledStudents()).map((s) => {
      const c = perStudent.get(s.id) ?? { tracked: 0, weak: 0, weakList: [] };
      return [s.name, c.tracked, c.weak, c.weakList.join("، ") || "—"];
    }),
  };
}
