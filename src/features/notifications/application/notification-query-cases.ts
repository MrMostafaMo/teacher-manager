import type { NotificationRow } from "@/lib/db/schema";
import type { NotificationItem, NotificationType } from "@/features/notifications/domain";
import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";

export type NotificationFilter = (type: NotificationType) => boolean;

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
  let details: NotificationItem["details"];
  try {
    details = JSON.parse(row.details) as NotificationItem["details"];
  } catch {
    details = {};
  }
  return { ...row, details };
}

/**
 * Non-dismissed rows, newest first, with parsed details. Muted types are
 * hidden here (not deleted) so unmuting restores them with state intact.
 */
export async function listActiveNotifications(isEnabled?: NotificationFilter): Promise<ActiveNotification[]> {
  const rows = await notificationRepository.listActive();
  const visible = isEnabled ? rows.filter((r) => isEnabled(r.type as NotificationType)) : rows;
  return [...visible].sort((a, b) => b.createdAt - a.createdAt).map(parseDetails);
}

export async function unreadCount(isEnabled?: NotificationFilter): Promise<number> {
  const rows = await notificationRepository.listActive();
  const visible = isEnabled ? rows.filter((r) => isEnabled(r.type as NotificationType)) : rows;
  return visible.filter((r) => !r.read).length;
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
