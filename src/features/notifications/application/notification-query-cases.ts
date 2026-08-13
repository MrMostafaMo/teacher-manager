import type { NotificationRow } from "@/lib/db/schema";
import type { NotificationItem } from "@/features/notifications/domain";
import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";

export interface ActiveNotification {
  id: string;
  type: string;
  key: string;
  details: NotificationItem["details"];
  read: boolean;
  dismissed: boolean;
  createdAt: number;
  updatedAt: number;
}

function parseDetails(row: NotificationRow): ActiveNotification {
  let details: NotificationItem["details"] = {};
  try {
    details = JSON.parse(row.details) as NotificationItem["details"];
  } catch {
    details = {};
  }
  return { ...row, details };
}

/** Non-dismissed rows, newest first, with parsed details. */
export async function listActiveNotifications(): Promise<ActiveNotification[]> {
  const rows = await notificationRepository.listActive();
  return [...rows].sort((a, b) => b.createdAt - a.createdAt).map(parseDetails);
}

export async function unreadCount(): Promise<number> {
  const rows = await notificationRepository.listActive();
  return rows.filter((r) => !r.read).length;
}

export async function markNotificationRead(id: string): Promise<void> {
  await notificationRepository.markRead(id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await notificationRepository.markAllRead();
}

export async function dismissNotification(id: string): Promise<void> {
  await notificationRepository.dismiss(id);
}

export async function dismissAllNotifications(): Promise<void> {
  await notificationRepository.dismissAll();
}
