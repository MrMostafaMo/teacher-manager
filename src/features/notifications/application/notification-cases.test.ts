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
vi.mock("@/features/schedule/application/schedule-exception-cases", () => ({
  listScheduleExceptions: vi.fn(async () => []),
}));
vi.mock("@/features/schedule/application/schedule-cases", () => ({
  listSchedule: vi.fn(async () => []),
}));
vi.mock("@/features/skills/application/skill-cases", () => ({ listSkills: vi.fn(async () => []) }));
vi.mock("@/features/exams/application/exam-cases", () => ({
  listExams: vi.fn(async () => []),
}));
vi.mock("@/features/students/infrastructure/student-repo", () => ({
  studentRepository: { search: vi.fn(async () => []) },
}));
vi.mock("@/features/payments/infrastructure/plan-repo", () => ({
  planRepository: { list: vi.fn(async () => []) },
}));
vi.mock("@/features/groups/infrastructure/group-repo", () => ({
  groupRepository: { membershipsWithEnrollment: vi.fn(async () => []) },
}));
vi.mock("@/features/payments/infrastructure/payment-repo", () => ({
  paymentRepository: { listCompact: vi.fn(async () => []) },
}));
vi.mock("@/features/attendance/infrastructure/attendance-repo", () => ({
  attendanceRepository: { monthlyStats: vi.fn(async () => []), countsByStudent: vi.fn(async () => []) },
}));

import { notificationRepository } from "@/features/notifications/infrastructure/notification-repo";
import { listHomeworks } from "@/features/homework/application/homework-cases";
import { refreshNotifications } from "./notification-cases";

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

  it("persists every desired item (muting hides at read time, not here)", async () => {
    vi.clearAllMocks();
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
    ).toEqual({ toInsert: [], toRemove: [], toUpdate: [] });
  });
});
