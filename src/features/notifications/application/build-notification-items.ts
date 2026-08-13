import type { HomeworkListItem } from "@/features/homework/application/homework-cases";
import type { DuesRow } from "@/features/payments/application/payment-cases";
import type { StudentMonthlyRow } from "@/features/attendance/application/attendance-cases";
import type { SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import type { SessionException } from "@/lib/db/schema";
import type { NotificationItem } from "@/features/notifications/domain";

export interface NotificationSourceData {
  homeworks: HomeworkListItem[];
  dues: DuesRow[];
  exceptions: SessionException[];
  skills: SkillWithWeakCount[];
  monthly: StudentMonthlyRow[];
}

/** Low-attendance threshold: rate strictly below this notifies. */
export const LOW_ATTENDANCE_RATE = 0.7;

function homeworkItem(h: HomeworkListItem): NotificationItem {
  return {
    type: "homework_overdue",
    key: `homework:${h.id}`,
    details: { title: h.title, dueDate: h.dueDate, pending: h.pending, groupName: h.groupName },
  };
}

function paymentItem(r: DuesRow, period: string): NotificationItem {
  return {
    type: "payment_overdue",
    key: `payment:${r.student.id}:${period}`,
    details: { name: r.student.name, remaining: r.remaining, period },
  };
}

function exceptionItem(ex: SessionException): NotificationItem {
  return {
    type: "exception",
    key: `exception:${ex.id}`,
    details: { sessionId: ex.sessionId, date: ex.date, kind: ex.type },
  };
}

function weakSkillItem(s: SkillWithWeakCount): NotificationItem {
  return {
    type: "weak_skill",
    key: `weak:${s.id}`,
    details: { name: s.name, count: s.weakCount },
  };
}

function attendanceItem(r: StudentMonthlyRow, month: string, rate: number): NotificationItem {
  return {
    type: "low_attendance",
    key: `attendance:${r.studentId}:${month}`,
    details: { name: r.name, rate, absent: r.absent },
  };
}

function attendanceRate(r: StudentMonthlyRow): number {
  const marked = r.present + r.absent + r.late + r.excused;
  if (marked === 0) return 1;
  return (r.present + r.late + r.excused) / marked;
}

/** Build the desired notification set from the five source lists. */
export function buildNotificationItems(
  data: NotificationSourceData,
  month: string,
  today: string,
): NotificationItem[] {
  const items: NotificationItem[] = [];
  for (const h of data.homeworks) if (h.overdue) items.push(homeworkItem(h));
  for (const r of data.dues) if (r.remaining > 0) items.push(paymentItem(r, month));
  for (const ex of data.exceptions) if (ex.date >= today) items.push(exceptionItem(ex));
  for (const s of data.skills) if (s.weakCount > 0) items.push(weakSkillItem(s));
  for (const r of data.monthly) {
    const rate = attendanceRate(r);
    if (rate < LOW_ATTENDANCE_RATE) items.push(attendanceItem(r, month, rate));
  }
  return items;
}
