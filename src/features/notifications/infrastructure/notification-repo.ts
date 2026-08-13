import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { createRepository } from "@/lib/db/repository";
import { notifications, type NotificationRow } from "@/lib/db/schema";

const base = createRepository(notifications);

/** Notification store. `listActive` serves the bell; `listAll` feeds the
 * refresh trim. Flag updates are bulk so mark-all/dismiss-all are one
 * statement. */
export const notificationRepository = {
  ...base,

  /** All rows, newest first (refresh's merge + trim). */
  listAll: (): Promise<NotificationRow[]> => base.list({ newestFirst: true }),

  /** Non-dismissed rows, newest first (the bell list). */
  listActive: async (): Promise<NotificationRow[]> => {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.dismissed, false))
      .orderBy(desc(notifications.createdAt));
    return rows as unknown as NotificationRow[];
  },

  markRead: async (id: string): Promise<void> => {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  },

  markAllRead: async (): Promise<void> => {
    await db.update(notifications).set({ read: true });
  },

  dismiss: async (id: string): Promise<void> => {
    await db.update(notifications).set({ dismissed: true }).where(eq(notifications.id, id));
  },

  dismissAll: async (): Promise<void> => {
    await db.update(notifications).set({ dismissed: true });
  },
};
