import { beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { exceptionRepository } from "@/features/schedule/infrastructure/exception-repo";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { logActivity } from "@/lib/activity-log";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import { OccurrenceConflictError } from "./schedule-oneoff-cases";
import { moveOccurrenceAcrossDays, restoreMovedOccurrence } from "./schedule-move-day-cases";

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
  exceptionRepository: {
    listForDates: vi.fn(),
    clearForSessionDate: vi.fn(),
    insert: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("@/features/groups/infrastructure/group-repo", () => ({
  groupRepository: { findById: vi.fn() },
}));
vi.mock("@/lib/activity-log", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/undo-store", () => ({ registerUndo: vi.fn(() => 9) }));
vi.mock("@/lib/db/snapshot", () => ({
  captureRows: vi.fn(async () => []),
  captureBy: vi.fn(async () => []),
  restoreRows: vi.fn(),
}));
function session(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  return {
    id: "src",
    groupId: "g1",
    groupName: "Group",
    groupStatus: "active",
    groupStartsOn: null,
    dayOfWeek: 0, // Sunday
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
// 2026-09-13 is a Sunday, 2026-09-14 a Monday.
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(scheduleRepository.findById).mockResolvedValue(session() as never);
  vi.mocked(groupRepository.findById).mockResolvedValue(group as never);
  vi.mocked(scheduleRepository.listAll).mockResolvedValue([session()]);
  vi.mocked(exceptionRepository.listForDates).mockResolvedValue([]);
  vi.mocked(scheduleRepository.insert).mockResolvedValue({} as never);
});
describe("moveOccurrenceAcrossDays", () => {
  it("cancels the source and creates a linked one-off on the target date", async () => {
    await moveOccurrenceAcrossDays({
      sessionId: "src",
      date: "2026-09-13",
      targetDate: "2026-09-14",
      startTime: "12:00",
      endTime: "13:00",
    });
    expect(exceptionRepository.clearForSessionDate).toHaveBeenCalledWith("src", "2026-09-13");
    expect(exceptionRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "src", date: "2026-09-13", type: "cancelled" }),
    );
    expect(scheduleRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "g1",
        dayOfWeek: 1,
        oneOffDate: "2026-09-14",
        movedFromSessionId: "src",
        movedFromDate: "2026-09-13",
      }),
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: "schedule.exceptionMoveDay" }),
    );
  });
  it("rejects a source date off the session weekday", async () => {
    await expect(
      moveOccurrenceAcrossDays({
        sessionId: "src",
        date: "2026-09-14",
        targetDate: "2026-09-15",
        startTime: "12:00",
        endTime: "13:00",
      }),
    ).rejects.toThrow("weekday");
  });
  it("blocks a target that double-books the group", async () => {
    vi.mocked(scheduleRepository.listAll).mockResolvedValue([
      session(),
      session({ id: "mon", dayOfWeek: 1, startTime: "12:00", endTime: "13:00" }),
    ]);
    await expect(
      moveOccurrenceAcrossDays({
        sessionId: "src",
        date: "2026-09-13",
        targetDate: "2026-09-14",
        startTime: "12:00",
        endTime: "13:00",
      }),
    ).rejects.toBeInstanceOf(OccurrenceConflictError);
  });
  it("refuses to move a one-off session", async () => {
    vi.mocked(scheduleRepository.findById).mockResolvedValue(
      session({ id: "o", oneOffDate: "2026-09-13", dayOfWeek: 0 }) as never,
    );
    await expect(
      moveOccurrenceAcrossDays({
        sessionId: "o",
        date: "2026-09-13",
        targetDate: "2026-09-14",
        startTime: "12:00",
        endTime: "13:00",
      }),
    ).rejects.toThrow();
  });
});
describe("restoreMovedOccurrence", () => {
  it("removes the one-off and the source cancellation", async () => {
    vi.mocked(scheduleRepository.findById).mockResolvedValue(
      session({
        id: "o1",
        oneOffDate: "2026-09-14",
        movedFromSessionId: "src",
        movedFromDate: "2026-09-13",
      }) as never,
    );
    vi.mocked(exceptionRepository.listForDates).mockResolvedValue([
      {
        id: "e1",
        sessionId: "src",
        date: "2026-09-13",
        type: "cancelled",
        startTime: null,
        endTime: null,
        room: null,
        createdAt: 0,
        updatedAt: 0,
      },
    ]);
    await restoreMovedOccurrence("o1");
    expect(scheduleRepository.remove).toHaveBeenCalledWith("o1");
    expect(exceptionRepository.remove).toHaveBeenCalledWith("e1");
  });
  it("refuses plain one-offs and recurring sessions", async () => {
    vi.mocked(scheduleRepository.findById).mockResolvedValue(
      session({ id: "o", oneOffDate: "2026-09-14" }) as never,
    );
    await expect(restoreMovedOccurrence("o")).rejects.toThrow();
  });
});
