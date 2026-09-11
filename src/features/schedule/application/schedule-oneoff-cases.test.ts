import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { exceptionRepository } from "@/features/schedule/infrastructure/exception-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import { registerUndo } from "@/lib/undo-store";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import {
  OccurrenceConflictError,
  createOneOffSession,
  deleteOneOffSession,
} from "./schedule-oneoff-cases";

vi.mock("@/features/schedule/infrastructure/schedule-repo", () => ({
  scheduleRepository: {
    listAll: vi.fn(),
    insert: vi.fn(),
    findById: vi.fn(),
    remove: vi.fn(),
    clearForSession: vi.fn(),
  },
}));
vi.mock("@/features/schedule/infrastructure/exception-repo", () => ({
  exceptionRepository: { listForDates: vi.fn() },
}));
vi.mock("@/features/groups/infrastructure/group-repo", () => ({
  groupRepository: { findById: vi.fn() },
}));
vi.mock("@/lib/activity-log", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/undo-store", () => ({ registerUndo: vi.fn(() => 7) }));
vi.mock("@/lib/db/snapshot", () => ({
  captureRows: vi.fn(async () => []),
  captureBy: vi.fn(async () => []),
  restoreRows: vi.fn(),
}));

function session(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  return {
    id: "s1",
    groupId: "g1",
    groupName: "Group",
    groupStatus: "active",
    groupStartsOn: null,
    dayOfWeek: 1,
    startTime: "10:00",
    endTime: "11:00",
    room: "R1",
    oneOffDate: null,
    movedFromSessionId: null,
    movedFromDate: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const group = { id: "g1", status: "active", startsOn: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(groupRepository.findById).mockResolvedValue(group as never);
  vi.mocked(exceptionRepository.listForDates).mockResolvedValue([]);
  vi.mocked(scheduleRepository.listAll).mockResolvedValue([]);
  vi.mocked(scheduleRepository.insert).mockResolvedValue({} as never);
});

describe("createOneOffSession", () => {
  it("inserts a one-off row on the date's weekday", async () => {
    // 2026-09-14 is a Monday (dayOfWeek 1).
    await createOneOffSession({ groupId: "g1", date: "2026-09-14", startTime: "12:00", endTime: "13:00" });
    expect(scheduleRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: "g1", dayOfWeek: 1, oneOffDate: "2026-09-14" }),
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "schedule.oneOffCreate" }),
    );
  });

  it("blocks same-group overlaps", async () => {
    vi.mocked(scheduleRepository.listAll).mockResolvedValue([session({ id: "r" })]);
    await expect(
      createOneOffSession({ groupId: "g1", date: "2026-09-14", startTime: "10:30", endTime: "11:30" }),
    ).rejects.toBeInstanceOf(OccurrenceConflictError);
    expect(scheduleRepository.insert).not.toHaveBeenCalled();
  });

  it("blocks same-room overlaps of another group", async () => {
    vi.mocked(scheduleRepository.listAll).mockResolvedValue([session({ id: "r" })]);
    await expect(
      createOneOffSession({ groupId: "g2", date: "2026-09-14", startTime: "10:30", endTime: "11:30", room: "R1" }),
    ).rejects.toBeInstanceOf(OccurrenceConflictError);
  });

  it("rejects inactive or not-started groups", async () => {
    vi.mocked(groupRepository.findById).mockResolvedValue({ ...group, status: "inactive" } as never);
    await expect(
      createOneOffSession({ groupId: "g1", date: "2026-09-14", startTime: "12:00", endTime: "13:00" }),
    ).rejects.toThrow();
    vi.mocked(groupRepository.findById).mockResolvedValue({ ...group, startsOn: "2026-10-01" } as never);
    await expect(
      createOneOffSession({ groupId: "g1", date: "2026-09-14", startTime: "12:00", endTime: "13:00" }),
    ).rejects.toThrow();
  });
});

describe("deleteOneOffSession", () => {
  it("refuses to delete a recurring session", async () => {
    vi.mocked(scheduleRepository.findById).mockResolvedValue(session() as never);
    await expect(deleteOneOffSession("s1")).rejects.toThrow();
    expect(scheduleRepository.remove).not.toHaveBeenCalled();
  });

  it("removes the one-off and registers an undo", async () => {
    vi.mocked(scheduleRepository.findById).mockResolvedValue(
      session({ id: "o1", oneOffDate: "2026-09-14" }) as never,
    );
    const undoId = await deleteOneOffSession("o1");
    expect(scheduleRepository.remove).toHaveBeenCalledWith("o1");
    expect(registerUndo).toHaveBeenCalled();
    expect(undoId).toBe(7);
  });
});
