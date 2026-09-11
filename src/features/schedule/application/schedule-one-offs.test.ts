import { describe, expect, it } from "vitest";
import type { SessionException } from "@/lib/db/schema";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import {
  effectiveSessionsForDate,
  hasOccurrenceConflict,
  isOneOff,
  splitOccurrences,
} from "./schedule-one-offs";

let counter = 0;
function session(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  counter += 1;
  return {
    id: `s${counter}`,
    groupId: "g1",
    dayOfWeek: 1,
    startTime: "10:00",
    endTime: "11:00",
    room: "R1",
    oneOffDate: null,
    movedFromSessionId: null,
    movedFromDate: null,
    createdAt: 0,
    updatedAt: 0,
    groupName: "Group",
    groupStatus: "active",
    groupStartsOn: null,
    ...overrides,
  };
}

function oneOff(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  // 2026-09-14 is a Monday (dayOfWeek 1).
  return session({ oneOffDate: "2026-09-14", ...overrides });
}

function exception(overrides: Partial<SessionException> = {}): SessionException {
  return {
    id: "e1",
    sessionId: "s1",
    date: "2026-09-14",
    type: "cancelled",
    startTime: null,
    endTime: null,
    room: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("isOneOff / splitOccurrences", () => {
  it("detects one-off rows by oneOffDate", () => {
    expect(isOneOff(session())).toBe(false);
    expect(isOneOff(oneOff())).toBe(true);
    expect(isOneOff(session({ oneOffDate: "" }))).toBe(false);
  });

  it("splits recurring from one-off rows", () => {
    const a = session({ id: "a" });
    const b = oneOff({ id: "b" });
    expect(splitOccurrences([a, b])).toEqual({ recurring: [a], oneOffs: [b] });
  });
});

describe("effectiveSessionsForDate", () => {
  it("includes the recurring session of that weekday", () => {
    const s = session({ id: "s1" });
    expect(effectiveSessionsForDate([s], [], "2026-09-14")).toEqual([s]);
  });

  it("excludes one-offs of other dates but includes this date's", () => {
    const other = oneOff({ id: "o1", oneOffDate: "2026-09-15" });
    const today = oneOff({ id: "o2" });
    expect(effectiveSessionsForDate([other], [], "2026-09-14")).toEqual([]);
    expect(effectiveSessionsForDate([today], [], "2026-09-14")).toEqual([today]);
  });

  it("excludes one-offs of inactive or not-started groups", () => {
    const inactive = oneOff({ id: "o1", groupStatus: "inactive" });
    const future = oneOff({ id: "o2", groupStartsOn: "2026-10-01" });
    expect(effectiveSessionsForDate([inactive, future], [], "2026-09-14")).toEqual([]);
  });

  it("drops cancelled recurring sessions and applies moved times", () => {
    const s = session({ id: "s1" });
    const cancelled = effectiveSessionsForDate([s], [exception()], "2026-09-14");
    expect(cancelled).toEqual([]);
    const moved = effectiveSessionsForDate(
      [s],
      [exception({ type: "moved", startTime: "14:00", endTime: "15:00" })],
      "2026-09-14",
    );
    expect(moved[0].startTime).toBe("14:00");
  });
});

describe("hasOccurrenceConflict", () => {
  const day = [session({ id: "s1", groupId: "g1", startTime: "10:00", endTime: "11:00", room: "R1" })];

  it("flags same-group overlaps even in another room", () => {
    expect(
      hasOccurrenceConflict(day, { groupId: "g1", startTime: "10:30", endTime: "11:30", room: "R9" }),
    ).toBe(true);
  });

  it("flags same-room overlaps of another group", () => {
    expect(
      hasOccurrenceConflict(day, { groupId: "g2", startTime: "10:30", endTime: "11:30", room: "R1" }),
    ).toBe(true);
  });

  it("allows back-to-back sessions and excludes self", () => {
    expect(
      hasOccurrenceConflict(day, { groupId: "g2", startTime: "11:00", endTime: "12:00", room: "R1" }),
    ).toBe(false);
    expect(
      hasOccurrenceConflict(day, {
        id: "s1",
        groupId: "g1",
        startTime: "10:00",
        endTime: "11:00",
        room: "R1",
      }),
    ).toBe(false);
  });
});


