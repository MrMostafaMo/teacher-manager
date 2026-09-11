import { describe, expect, it } from "vitest";
import type { SessionException } from "@/lib/db/schema";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import { applyExceptions, conflictIds, type SessionWithException } from "./schedule-exceptions";

let counter = 1000;
function session(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  counter += 1;
  return {
    id: `s${counter}`,
    groupId: "g1",
    dayOfWeek: 3,
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

function exception(overrides: Partial<SessionException> = {}): SessionException {
  return {
    id: "e1",
    sessionId: "s1",
    date: "2026-08-13",
    type: "cancelled",
    startTime: null,
    endTime: null,
    room: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("applyExceptions with daysOrder", () => {
  it("maps buckets by weekday for a Saturday-first week", () => {
    const sunday = session({ id: "s1", dayOfWeek: 0 });
    const saturday = session({ id: "s2", dayOfWeek: 6 });
    const byDay = [[sunday], [], [], [], [], [], [saturday]];
    const dates = [
      new Date(2026, 7, 15),
      new Date(2026, 7, 16),
      new Date(2026, 7, 17),
      new Date(2026, 7, 18),
      new Date(2026, 7, 19),
      new Date(2026, 7, 20),
      new Date(2026, 7, 21),
    ];
    const out = applyExceptions(byDay, [exception({ sessionId: "s1", date: "2026-08-16" })], dates, [
      6, 0, 1, 2, 3, 4, 5,
    ]);
    expect((out[0][0] as SessionWithException).exception?.type).toBe("cancelled");
    expect(out[6][0]).toBe(saturday);
  });
});

describe("conflictIds without cancelled", () => {
  it("ignores cancelled occurrences when detecting conflicts", () => {
    const a = {
      ...session({ id: "a", startTime: "10:00", endTime: "11:00", room: "R1" }),
      exception: {
        id: "e1",
        type: "cancelled" as const,
        date: "2026-08-13",
        startTime: null,
        endTime: null,
        room: null,
      },
    };
    const b = session({ id: "b", startTime: "10:30", endTime: "11:30", room: "R1" });
    expect(conflictIds([[a, b]])).toEqual(new Set());
  });
});
