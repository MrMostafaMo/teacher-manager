import dayjs from "dayjs";
import { getMonthly } from "@/features/attendance/application/attendance-cases";
import { listExams } from "@/features/exams/application/exam-cases";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { monthlyDues } from "@/features/payments/application/payment-cases";
import { sessionDues } from "@/features/payments/application/session-dues-cases";
import { listScheduleExceptions } from "@/features/schedule/application/schedule-exception-cases";
import { listSkills } from "@/features/skills/application/skill-cases";
import { listStudents } from "@/features/students/application/student-cases";
import { uuid } from "@/lib/utils/uuid";
import type { NotificationItem } from "@/features/notifications/domain";
import { useNotificationSettings, isNotificationEnabled } from "@/lib/notification-settings-store";
import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";
import { buildNotificationItems } from "./build-notification-items";
import { mergeItems } from "./merge-items";

/** Newest rows to keep in the table (older ones are pruned on refresh). */
export const ACTIVE_NOTIFICATION_LIMIT = 100;

/** Regenerate the notification set and return the newly inserted items. */
export async function refreshNotifications(): Promise<NotificationItem[]> {
  const month = dayjs().format("YYYY-MM");
  const today = dayjs().format("YYYY-MM-DD");
  const [homeworks, exams, dues, exceptions, skills, monthly, students, sessionDuesRows] =
    await Promise.all([
      listHomeworks(),
      listExams(),
      monthlyDues(month),
      listScheduleExceptions(),
      listSkills(),
      getMonthly(month),
      listStudents({ status: "all" }),
      sessionDues(),
    ]);
  const desired = buildNotificationItems(
    { homeworks, exams, dues, exceptions, skills, monthly, students, sessionDues: sessionDuesRows },
    month,
    today,
  );
  const settings = useNotificationSettings.getState();
  const filtered = desired.filter((item) => isNotificationEnabled(settings, item.type));
  const existing = await notificationRepository.listAll();
  const { toInsert, toRemove } = mergeItems(existing, filtered);
  for (const id of toRemove) await notificationRepository.remove(id);
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

/** Removal priority: dismissed < read < active-unread, newest first per tier.
 *  Keeps the newest ACTIVE_NOTIFICATION_LIMIT rows, pruning stale (read or
 *  dismissed) rows before live unread ones (spec: "dismissed or read first"). */
async function trimToLimit(): Promise<void> {
  const all = await notificationRepository.listAll();
  if (all.length <= ACTIVE_NOTIFICATION_LIMIT) return;
  const priority = (r: { read: boolean; dismissed: boolean }): number =>
    (r.dismissed ? 0 : 1) + (r.read ? 0 : 1);
  const toRemove = [...all]
    .sort((a, b) => priority(a) - priority(b) || a.createdAt - b.createdAt)
    .slice(0, all.length - ACTIVE_NOTIFICATION_LIMIT);
  for (const row of toRemove) await notificationRepository.remove(row.id);
}
