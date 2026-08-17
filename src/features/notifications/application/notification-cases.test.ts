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

vi.mock("@/features/homework/application/homework-cases", () => ({
  listHomeworks: vi.fn(async () => []),
}));
vi.mock("@/features/payments/application/payment-cases", () => ({
  monthlyDues: vi.fn(async () => []),
}));
vi.mock("@/features/schedule/application/schedule-exception-cases", () => ({
  listScheduleExceptions: vi.fn(async () => []),
}));
vi.mock("@/features/skills/application/skill-cases", () => ({ listSkills: vi.fn(async () => []) }));
vi.mock("@/features/attendance/application/attendance-cases", () => ({
  getMonthly: vi.fn(async () => []),
}));
vi.mock("@/features/exams/application/exam-cases", () => ({
  listExams: vi.fn(async () => []),
}));
vi.mock("@/features/students/application/student-cases", () => ({
  listStudents: vi.fn(async () => []),
}));

import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { refreshNotifications } from "./notification-cases";
import {
  dismissAllNotifications,
  dismissNotification,
  listActiveNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
} from "./notification-query-cases";

describe("refreshNotifications", () => {
  it("inserts new items and returns them", async () => {
    vi.mocked(listHomeworks).mockResolvedValueOnce([
      {
        id: "h1",
        title: "T",
        dueDate: "2026-08-01",
        pending: 1,
        groupName: null,
        overdue: true,
      } as never,
    ]);
    vi.mocked(notificationRepository.listAll).mockResolvedValueOnce([]);
    vi.mocked(notificationRepository.listAll).mockResolvedValueOnce([]);
    vi.mocked(notificationRepository.insert).mockImplementation(
      async (v) => ({ ...v, createdAt: 0, updatedAt: 0 }) as never,
    );

    const fresh = await refreshNotifications();

    expect(fresh.map((i) => i.key)).toEqual(["homework:h1"]);
    expect(notificationRepository.insert).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(notificationRepository.insert).mock.calls[0][0] as {
      details: string;
      read: boolean;
      dismissed: boolean;
    };
    expect(arg.read).toBe(false);
    expect(arg.dismissed).toBe(false);
    expect(JSON.parse(arg.details).title).toBe("T");
  });

  it("removes stored rows whose condition resolved", async () => {
    vi.mocked(notificationRepository.listAll).mockResolvedValue([
      {
        id: "old",
        key: "weak:k9",
        type: "weak_skill",
        details: "{}",
        read: false,
        dismissed: false,
        createdAt: 0,
        updatedAt: 0,
      } as never,
    ]);
    vi.mocked(notificationRepository.remove).mockResolvedValue(true);

    await refreshNotifications();

    expect(notificationRepository.remove).toHaveBeenCalledWith("old");
  });

  it("returns no new items when nothing changed", async () => {
    vi.mocked(notificationRepository.listAll).mockResolvedValue([
      {
        id: "a",
        key: "weak:k1",
        type: "weak_skill",
        details: "{}",
        read: true,
        dismissed: false,
        createdAt: 0,
        updatedAt: 0,
      } as never,
    ]);
    // Simulate the same desired set by injecting through the real generator:
    // default mocked sources are empty, so nothing is desired and "a" is removed.
    // So instead feed a matching key via a direct test of the pure path:
    const { mergeItems } = await import("./merge-items");
    expect(
      mergeItems(
        [{ id: "a", key: "weak:k1" }],
        [{ type: "weak_skill", key: "weak:k1", details: {} }],
      ),
    ).toEqual({ toInsert: [], toRemove: [] });
  });
});

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

  it("parses details JSON for the active list and computes unread count", async () => {
    vi.mocked(notificationRepository.listActive).mockResolvedValue([
      {
        id: "a",
        key: "weak:k1",
        type: "weak_skill",
        details: JSON.stringify({ name: "F", count: 2 }),
        read: false,
        dismissed: false,
        createdAt: 1,
        updatedAt: 1,
      } as never,
      {
        id: "b",
        key: "homework:h1",
        type: "homework_overdue",
        details: JSON.stringify({ title: "T" }),
        read: true,
        dismissed: false,
        createdAt: 2,
        updatedAt: 2,
      } as never,
    ]);

    const active = await listActiveNotifications();
    expect(active[0].details).toEqual({ title: "T" });
    expect(active.length).toBe(2);
    expect(await unreadCount()).toBe(1);
  });
});
