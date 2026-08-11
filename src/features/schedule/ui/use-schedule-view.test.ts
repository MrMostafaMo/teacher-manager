import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import { useScheduleView } from "./use-schedule-view";

function session(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  return {
    id: "s1",
    groupId: "g1",
    groupName: "Group A",
    groupStatus: "active",
    groupStartsOn: null,
    dayOfWeek: 0,
    startTime: "10:00",
    endTime: "11:00",
    room: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("useScheduleView", () => {
  it("buckets sessions into weekday slots", () => {
    const { result } = renderHook(() =>
      useScheduleView([
        session({ id: "a", dayOfWeek: 0 }),
        session({ id: "b", dayOfWeek: 0 }),
        session({ id: "c", dayOfWeek: 3 }),
      ]),
    );
    expect(result.current.byDay).toHaveLength(7);
    expect(result.current.byDay[0].map((s) => s.id)).toEqual(["a", "b"]);
    expect(result.current.byDay[3].map((s) => s.id)).toEqual(["c"]);
    expect(result.current.byDay[1]).toHaveLength(0);
  });

  it("flags overlapping sessions that share a day and room", () => {
    const { result } = renderHook(() =>
      useScheduleView([
        session({ id: "a", room: "R1", startTime: "09:00", endTime: "10:00" }),
        session({ id: "b", room: "R1", startTime: "09:30", endTime: "10:30" }),
      ]),
    );
    expect([...result.current.conflicts].sort()).toEqual(["a", "b"]);
  });

  it("does not flag touching or different-day overlaps", () => {
    const { result } = renderHook(() =>
      useScheduleView([
        session({ id: "a", room: "R1", startTime: "09:00", endTime: "10:00" }),
        session({ id: "b", room: "R1", startTime: "10:00", endTime: "11:00" }),
        session({ id: "c", room: "R1", dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }),
      ]),
    );
    expect(result.current.conflicts.size).toBe(0);
  });

  it("ignores room-less sessions for conflict detection", () => {
    const { result } = renderHook(() =>
      useScheduleView([
        session({ id: "a", room: null, startTime: "09:00", endTime: "10:00" }),
        session({ id: "b", room: null, startTime: "09:30", endTime: "10:30" }),
      ]),
    );
    expect(result.current.conflicts.size).toBe(0);
  });

  it("groups by group id sorted by group name", () => {
    const { result } = renderHook(() =>
      useScheduleView([
        session({ id: "a", groupId: "gB", groupName: "Beta" }),
        session({ id: "b", groupId: "gA", groupName: "Alpha" }),
        session({ id: "c", groupId: "gB", groupName: "Beta" }),
      ]),
    );
    expect(result.current.byGroup.map(([id]) => id)).toEqual(["gA", "gB"]);
    expect(result.current.byGroup[1][1].map((s) => s.id)).toEqual(["a", "c"]);
  });
});
