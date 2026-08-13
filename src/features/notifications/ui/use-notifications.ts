import { useNotificationsStore } from "./notifications-store";

/** React binding for the notifications store (matches the store API). */
export function useNotifications() {
  const items = useNotificationsStore((s) => s.items);
  const unreadCount = useNotificationsStore((s) => s.unread);
  const loading = useNotificationsStore((s) => s.loading);
  const refresh = useNotificationsStore((s) => s.refresh);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const dismissAll = useNotificationsStore((s) => s.dismissAll);
  return { items, unreadCount, loading, refresh, markRead, markAllRead, dismiss, dismissAll };
}
