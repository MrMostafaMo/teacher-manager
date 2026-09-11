import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/notifications/infrastructure/notification-repo", () => ({
  notificationRepository: {
    listAll: vi.fn(),
    listActive: vi.fn(),
    insert: vi.fn(),
    remove: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    dismiss: vi.fn(),
    dismissAll: vi.fn(),
  },
}));

import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";
import {
  dismissAllNotifications,
  dismissNotification,
  listActiveNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
} from "./notification-query-cases";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "a",
    key: "weak:k1",
    type: "weak_skill",
    details: "{}",
    read: false,
    dismissed: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  } as never;
}

describe("notification actions", () => {
  it("marks one read, all read, dismisses one, dismisses all", async () => {
    await markNotificationRead("a");
    expect(notificationRepository.markRead).toHaveBeenCalledWith("a");
    await markAllNotificationsRead();
    expect(notificationRepository.markAllRead).toHaveBeenCalled();
    await dismissNotification("b");
    expect(notificationRepository.dismiss).toHaveBeenCalledWith("b");
    await dismissAllNotifications();
    expect(notificationRepository.dismissAll).toHaveBeenCalled();
  });
});

describe("muted-type filtering", () => {
  it("hides muted types at read time while keeping their rows", async () => {
    vi.mocked(notificationRepository.listActive).mockResolvedValue([
      row({ details: JSON.stringify({ name: "F", count: 2 }), createdAt: 1, updatedAt: 1 }),
      row({
        id: "b",
        key: "homework:h1",
        type: "homework_overdue",
        details: JSON.stringify({ title: "T" }),
        createdAt: 2,
        updatedAt: 2,
      }),
    ]);

    const visible = await listActiveNotifications((t) => t !== "weak_skill");
    expect(visible.map((r) => r.id)).toEqual(["b"]);
    expect(await unreadCount((t) => t !== "weak_skill")).toBe(1);
    // Unfiltered reads still see both rows (nothing was deleted).
    expect(await listActiveNotifications()).toHaveLength(2);
  });

  it("parses details JSON for the active list and computes unread count", async () => {
    vi.mocked(notificationRepository.listActive).mockResolvedValue([
      row({ details: JSON.stringify({ name: "F", count: 2 }), createdAt: 1, updatedAt: 1 }),
      row({
        id: "b",
        key: "homework:h1",
        type: "homework_overdue",
        details: JSON.stringify({ title: "T" }),
        read: true,
        createdAt: 2,
        updatedAt: 2,
      }),
    ]);

    const active = await listActiveNotifications();
    expect(active[0].details).toEqual({ title: "T" });
    expect(active.length).toBe(2);
    expect(await unreadCount()).toBe(1);
  });
});
