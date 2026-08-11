import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { Student } from "@/lib/db/schema";
import { listSchedule } from "@/features/schedule/application/schedule-cases";
import { groupRepository } from "@/features/groups/infrastructure/group-repo";
import { defaultStatuses } from "./attendance-defaults";

vi.mock("@/features/schedule/application/schedule-cases", () => ({
  listSchedule: vi.fn(),
}));
vi.mock("@/features/groups/infrastructure/group-repo", () => ({
  groupRepository: { memberships: vi.fn() },
}));

function student(id: string): Student {
  return {
    id,
    name: `Student ${id}`,
    phone: null,
    guardianName: null,
    guardianPhone: null,
    status: "active",
    notes: null,
    planId: null,
    enrolledOn: null,
    createdAt: 0,
    updatedAt: 0,
  };
}

function session(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  return {
    id: "s1",
    groupId: "g1",
    groupName: "Group A",
    groupStatus: "active",
    groupStartsOn: null,
    dayOfWeek: 3,
    startTime: "09:30",
    endTime: "10:30",
    room: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("defaultStatuses", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 13, 10, 0)); // Wednesday 10:00
    vi.mocked(listSchedule).mockResolvedValue([]);
    vi.mocked(groupRepository.memberships).mockResolvedValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it("defaults everything to present on past days without touching the schedule", async () => {
    const students = [student("a"), student("b")];
    const defaults = await defaultStatuses("2026-05-12", students);
    expect(defaults).toEqual({ a: "present", b: "present" });
    expect(listSchedule).not.toHaveBeenCalled();
  });

  it("defaults nothing on future days", async () => {
    const defaults = await defaultStatuses("2026-05-14", [student("a")]);
    expect(defaults).toEqual({});
    expect(listSchedule).not.toHaveBeenCalled();
  });

  it("defaults a single group's roster once its earliest session has started", async () => {
    vi.mocked(listSchedule).mockResolvedValue([session({ groupId: "g1", startTime: "09:30" })]);
    const defaults = await defaultStatuses("2026-05-13", [student("a")], "g1");
    expect(defaults).toEqual({ a: "present" });
  });

  it("leaves a group roster empty when today's session has not started", async () => {
    vi.mocked(listSchedule).mockResolvedValue([session({ groupId: "g1", startTime: "11:00" })]);
    const defaults = await defaultStatuses("2026-05-13", [student("a")], "g1");
    expect(defaults).toEqual({});
  });

  it("ignores inactive and future groups when computing the earliest start", async () => {
    vi.mocked(listSchedule).mockResolvedValue([
      session({ groupId: "g1", groupStatus: "inactive", startTime: "00:00" }),
      session({ groupId: "g2", groupStartsOn: "2026-05-14", startTime: "00:00" }),
      session({ groupId: "g3", startTime: "09:00" }),
    ]);
    vi.mocked(groupRepository.memberships).mockResolvedValue([
      { studentId: "a", groupId: "g1", groupName: "A" },
      { studentId: "b", groupId: "g2", groupName: "B" },
      { studentId: "c", groupId: "g3", groupName: "C" },
    ]);
    const defaults = await defaultStatuses("2026-05-13", [student("a"), student("b"), student("c")]);
    expect(defaults.a).toBeUndefined();
    expect(defaults.b).toBeUndefined();
    expect(defaults.c).toBe("present");
  });

  it("uses each student's earliest group start across memberships", async () => {
    vi.mocked(listSchedule).mockResolvedValue([
      session({ groupId: "g1", startTime: "08:00" }),
      session({ groupId: "g2", startTime: "11:00" }),
    ]);
    vi.mocked(groupRepository.memberships).mockResolvedValue([
      { studentId: "a", groupId: "g1", groupName: "A" },
      { studentId: "b", groupId: "g2", groupName: "B" },
    ]);
    const defaults = await defaultStatuses("2026-05-13", [student("a"), student("b")]);
    expect(defaults.a).toBe("present");
    expect(defaults.b).toBeUndefined();
  });
});
