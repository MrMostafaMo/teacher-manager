import { describe, expect, it } from "vitest";
import type { SessionException } from "@/lib/db/schema";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import { activeGroupIdsForDate } from "./schedule-exceptions";

let counter = 0;
function session(overrides: Partial<SessionWithGroup> = {}): SessionWithGroup {
  counter += 1;
  return {
    id: `s${counter}`,
    groupId: "g1",
    dayOfWeek: 3,
    startTime: "10:00",
    endTime: "11:00",
    room: "R1",
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

describe("activeGroupIdsForDate", () => {
  const cancelled = [exception({ sessionId: "s1", date: "2026-08-13" })];

  it("includes the group of a session that is not cancelled that date", () => {
    const s = session({ id: "s2", dayOfWeek: 4 }); // 2026-08-13 is a Thursday
    expect(activeGroupIdsForDate([s], cancelled, "2026-08-13")).toEqual(new Set(["g1"]));
  });

  it("drops the group when its only session that weekday is cancelled", () => {
    const s = session({ id: "s1", dayOfWeek: 4 });
    expect(activeGroupIdsForDate([s], cancelled, "2026-08-13").size).toBe(0);
  });

  it("keeps the group when another session that weekday still runs", () => {
    const a = session({ id: "s1", dayOfWeek: 4 });
    const b = session({ id: "s2", dayOfWeek: 4 });
    expect(activeGroupIdsForDate([a, b], cancelled, "2026-08-13")).toEqual(new Set(["g1"]));
  });

  it("ignores a cancellation on a different date", () => {
    const s = session({ id: "s1", dayOfWeek: 4 });
    // 2026-08-20 is also a Thursday — the 08-13 cancellation must not apply.
    expect(activeGroupIdsForDate([s], cancelled, "2026-08-20").size).toBe(1);
  });

  it("excludes inactive groups and groups that have not started", () => {
    const inactive = session({ id: "s1", groupStatus: "inactive" });
    const notStarted = session({ id: "s1", groupStartsOn: "2026-09-01" });
    expect(activeGroupIdsForDate([inactive], [], "2026-08-13").size).toBe(0);
    expect(activeGroupIdsForDate([notStarted], [], "2026-08-13").size).toBe(0);
  });
});
