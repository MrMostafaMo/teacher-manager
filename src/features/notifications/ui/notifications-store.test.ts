import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/notifications/application/notification-cases", () => ({
  refreshNotifications: vi.fn(),
}));

vi.mock("@/features/notifications/application/notification-query-cases", () => ({
  listActiveNotifications: vi.fn(),
  unreadCount: vi.fn(),
  markNotificationRead: vi.fn(async () => undefined),
  markAllNotificationsRead: vi.fn(async () => undefined),
  dismissNotification: vi.fn(async () => undefined),
  dismissAllNotifications: vi.fn(async () => undefined),
}));

import { refreshNotifications } from "@/features/notifications/application/notification-cases";
import {
  dismissNotification,
  listActiveNotifications,
  unreadCount,
} from "@/features/notifications/application/notification-query-cases";
import { useNotificationsStore } from "./notifications-store";

describe("notifications-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNotificationsStore.setState({ items: [], unread: 0 });
  });

  it("refresh updates items and unread count and returns fresh items", async () => {
    vi.mocked(listActiveNotifications).mockResolvedValue([
      { id: "a", type: "weak_skill", key: "weak:k1", details: { name: "F", count: 2 }, read: false, dismissed: false, createdAt: 1, updatedAt: 1 },
    ]);
    vi.mocked(unreadCount).mockResolvedValue(1);
    vi.mocked(refreshNotifications).mockResolvedValue([]);

    const fresh = await useNotificationsStore.getState().refresh();

    expect(fresh).toEqual([]);
    expect(useNotificationsStore.getState().items).toHaveLength(1);
    expect(useNotificationsStore.getState().unread).toBe(1);
  });

  it("dismiss removes the item from state", async () => {
    vi.mocked(dismissNotification).mockResolvedValue(undefined);
    vi.mocked(listActiveNotifications).mockResolvedValue([]);
    vi.mocked(unreadCount).mockResolvedValue(0);

    await useNotificationsStore.getState().dismiss("a");

    expect(dismissNotification).toHaveBeenCalledWith("a");
    expect(useNotificationsStore.getState().items).toEqual([]);
  });
});
