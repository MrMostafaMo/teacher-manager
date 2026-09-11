import { create } from "zustand";
import { refreshNotifications } from "@/features/notifications/application/notification-cases";
import { isNotificationEnabled, useNotificationSettings } from "@/lib/notification-settings-store";
import {
  dismissAllNotifications,
  dismissNotification,
  listActiveNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
  type ActiveNotification,
} from "@/features/notifications/application/notification-query-cases";
import type { NotificationItem } from "@/features/notifications/domain";

interface NotificationsState {
  items: ActiveNotification[];
  unread: number;
  loading: boolean;
  /** Rebuild the set; returns the newly inserted items (for system banners). */
  refresh: () => Promise<NotificationItem[]>;
  reload: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  dismissAll: () => Promise<void>;
}

async function load(): Promise<{ items: ActiveNotification[]; unread: number }> {
  const settings = useNotificationSettings.getState();
  const isEnabled = (type: Parameters<typeof isNotificationEnabled>[1]) =>
    isNotificationEnabled(settings, type);
  const [items, unread] = await Promise.all([
    listActiveNotifications(isEnabled),
    unreadCount(isEnabled),
  ]);
  return { items, unread };
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  unread: 0,
  loading: false,
  refresh: async () => {
    const fresh = await refreshNotifications();
    const loaded = await load();
    set(loaded);
    return fresh;
  },
  reload: async () => {
    const loaded = await load();
    set(loaded);
  },
  markRead: async (id) => {
    await markNotificationRead(id);
    const loaded = await load();
    set(loaded);
  },
  markAllRead: async () => {
    await markAllNotificationsRead();
    set({ unread: 0 });
  },
  dismiss: async (id) => {
    await dismissNotification(id);
    const loaded = await load();
    set(loaded);
  },
  dismissAll: async () => {
    await dismissAllNotifications();
    const loaded = await load();
    set(loaded);
  },
}));
