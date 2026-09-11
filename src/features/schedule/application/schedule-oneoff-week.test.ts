import { describe, expect, it } from "vitest";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import {
  groupIdsWithOneOffs,
  injectOneOffs,
  upcomingOneOffs,
} from "./schedule-one-offs";

let counter = 5000;
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

describe("injectOneOffs", () => {
  it("injects a one-off into its date bucket only", () => {
    const dates = [new Date(2026, 8, 13), new Date(2026, 8, 14)];
    const out = injectOneOffs([[], []], [oneOff({ id: "o1" })], dates, [0, 1]);
    expect(out[0]).toEqual([]);
    expect(out[1].map((s) => s.id)).toEqual(["o1"]);
  });

  it("ignores one-offs outside the visible week and keeps time order", () => {
    const dates = [new Date(2026, 8, 14)];
    const late = oneOff({ id: "late", startTime: "12:00" });
    const early = oneOff({ id: "early", startTime: "08:00" });
    const byDay = [[], [session({ id: "r", startTime: "10:00" })], [], [], [], [], []];
    const out = injectOneOffs(
      byDay,
      [late, early, oneOff({ id: "far", oneOffDate: "2026-12-01" })],
      dates,
      [1],
    );
    expect(out[1].map((s) => s.id)).toEqual(["early", "r", "late"]);
  });
});

describe("upcomingOneOffs / groupIdsWithOneOffs", () => {
  it("lists a group's future one-offs soonest first", () => {
    const rows = [
      oneOff({ id: "b", groupId: "g1", oneOffDate: "2026-09-20" }),
      oneOff({ id: "a", groupId: "g1", oneOffDate: "2026-09-15" }),
      oneOff({ id: "past", groupId: "g1", oneOffDate: "2026-09-01" }),
      oneOff({ id: "other", groupId: "g2", oneOffDate: "2026-09-16" }),
      session({ id: "recurring", groupId: "g1" }),
    ];
    expect(upcomingOneOffs(rows, "g1", "2026-09-14").map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("collects group ids with a one-off on the date", () => {
    const rows = [oneOff({ id: "a", groupId: "g1" }), oneOff({ id: "b", groupId: "g2" })];
    expect(groupIdsWithOneOffs(rows, "2026-09-14")).toEqual(new Set(["g1", "g2"]));
    expect(groupIdsWithOneOffs(rows, "2026-09-15")).toEqual(new Set());
  });
});
