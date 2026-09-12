import dayjs from "dayjs";
import { listExams } from "@/features/exams/application/exam-cases";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { computeMonthlyDues } from "@/features/payments/application/payment-cases";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { listScheduleExceptions } from "@/features/schedule/application/schedule-exception-cases";
import { isOneOff } from "@/features/schedule/application/schedule-one-offs";
import { listSkills } from "@/features/skills/application/skill-cases";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { planRepository } from "@/features/payments/infrastructure/plan-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { paymentRepository } from "@/features/payments/infrastructure/payment-repo";
import { attendanceRepository } from "@/features/attendance/infrastructure/attendance-repo";
import { computeMonthlyRows } from "@/features/attendance/application/attendance-cases";
import { monthEnd } from "@/lib/utils/enrollment";
import { uuid } from "@/lib/utils/uuid";
import type { NotificationItem } from "@/features/notifications/domain";
import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";
import { buildNotificationItems } from "./build-notification-items";
import { mergeItems } from "./merge-items";

/** Newest rows to keep in the table (older ones are pruned on refresh). */
export const ACTIVE_NOTIFICATION_LIMIT = 100;

/**
 * Regenerate the notification set and return the newly inserted items.
 * Muting is a read-time concern (see listActiveNotifications): the full
 * desired set always merges so muted rows keep their read/dismissed state.
 *
 * Single-pass dimensions: shared tables fetch once, every source derives
 * from the same pures the feature pages use (birthday check keeps the full
 * student list, including inactive students).
 */
export async function refreshNotifications(): Promise<NotificationItem[]> {
  const month = dayjs().format("YYYY-MM");
  const today = dayjs().format("YYYY-MM-DD");
  const [
    students,
    plans,
    enrichedMemberships,
    paymentsCompact,
    monthlyStats,
    skills,
    schedule,
    exceptions,
  ] = await Promise.all([
    studentRepository.search({ status: "all" }),
    planRepository.list(),
    groupRepository.membershipsWithEnrollment(),
    paymentRepository.listCompact(),
    attendanceRepository.monthlyStats(month),
    listSkills(),
    listSchedule(),
    listScheduleExceptions(),
  ]);
  const activeStudents = students.filter((s) => s.status === "active");
  const memberships = enrichedMemberships.map((m) => ({
    studentId: m.studentId,
    groupId: m.groupId,
    groupName: m.groupName,
  }));
  const dues = computeMonthlyDues(month, {
    activeStudents,
    plans,
    payments: paymentsCompact.filter((p) => p.period === month),
    memberships,
  });
  const monthly = computeMonthlyRows(activeStudents, monthlyStats, monthEnd(month));
  const [homeworks, exams] = await Promise.all([
    listHomeworks({ memberships: enrichedMemberships }),
    listExams({ memberships: enrichedMemberships }),
  ]);
  const desired = buildNotificationItems(
    {
      homeworks,
      exams,
      dues,
      exceptions,
      oneOffs: schedule.filter(isOneOff),
      skills,
      monthly,
      students,
    },
    month,
    today,
  );
  const existing = await notificationRepository.listAll();
  const { toInsert, toRemove, toUpdate } = mergeItems(existing, desired);
  for (const id of toRemove) await notificationRepository.remove(id);
  for (const u of toUpdate) {
    await notificationRepository.update(u.id, { details: JSON.stringify(u.details) });
  }
  for (const item of toInsert) {
    await notificationRepository.insert({
      id: uuid(),
      type: item.type,
      key: item.key,
      details: JSON.stringify(item.details),
      read: false,
      dismissed: false,
    });
  }
  await trimToLimit();
  return toInsert;
}

/** Removal priority: dismissed first, then read, then active-unread.
 *  Keeps the newest ACTIVE_NOTIFICATION_LIMIT rows, pruning stale rows before
 *  live unread ones (spec: "dismissed or read first"). */
async function trimToLimit(): Promise<void> {
  const all = await notificationRepository.listAll();
  if (all.length <= ACTIVE_NOTIFICATION_LIMIT) return;
  const priority = (r: { read: boolean; dismissed: boolean }): number =>
    r.dismissed ? 0 : r.read ? 1 : 2;
  const toRemove = [...all]
    .sort((a, b) => priority(a) - priority(b) || a.createdAt - b.createdAt)
    .slice(0, all.length - ACTIVE_NOTIFICATION_LIMIT);
  for (const row of toRemove) await notificationRepository.remove(row.id);
}
