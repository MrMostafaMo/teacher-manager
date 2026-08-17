import { describe, expect, it } from "vitest";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import type { SessionException } from "@/lib/db/schema";
import { todaySessions } from "./dashboard-helpers";

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

function exception(overrides: Partial<SessionException> = {}): SessionException {
  return {
    id: "e1",
    sessionId: "s1",
    date: "2026-05-10",
    type: "cancelled",
    startTime: null,
    endTime: null,
    room: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe("todaySessions", () => {
  const now = new Date(2026, 4, 10, 12, 0); // Sunday 12:00

  it("lists only active sessions scheduled on the weekday", () => {
    const sessions = [
      session({ id: "a", dayOfWeek: 0 }),
      session({ id: "b", dayOfWeek: 1 }),
      session({ id: "c", dayOfWeek: 0, groupStatus: "inactive" }),
    ];
    expect(todaySessions(sessions, now).map((s) => s.id)).toEqual(["a"]);
  });

  it("hides sessions whose group starts after today", () => {
    const sessions = [
      session({ id: "a", dayOfWeek: 0, groupStartsOn: "2026-05-10" }),
      session({ id: "b", dayOfWeek: 0, groupStartsOn: "2026-05-11" }),
      session({ id: "c", dayOfWeek: 0, groupStartsOn: null }),
    ];
    expect(todaySessions(sessions, now).map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("marks sessions already finished", () => {
    const sessions = [
      session({ id: "a", dayOfWeek: 0, startTime: "09:00", endTime: "10:00" }),
      session({ id: "b", dayOfWeek: 0, startTime: "13:00", endTime: "14:00" }),
    ];
    const listed = todaySessions(sessions, now);
    expect(listed.find((s) => s.id === "a")?.finished).toBe(true);
    expect(listed.find((s) => s.id === "b")?.finished).toBe(false);
  });

  it("drops a session cancelled today", () => {
    const sessions = [session({ id: "a", dayOfWeek: 0 }), session({ id: "b", dayOfWeek: 0 })];
    const listed = todaySessions(sessions, now, [exception({ sessionId: "a" })]);
    expect(listed.map((s) => s.id)).toEqual(["b"]);
  });

  it("keeps a session whose cancellation falls on another date", () => {
    const sessions = [session({ id: "a", dayOfWeek: 0 })];
    const listed = todaySessions(sessions, now, [
      exception({ sessionId: "a", date: "2026-05-17" }),
    ]);
    expect(listed.map((s) => s.id)).toEqual(["a"]);
  });

  it("uses the moved time for a same-date move", () => {
    const sessions = [
      session({ id: "a", dayOfWeek: 0, startTime: "09:00", endTime: "10:00", room: "R1" }),
    ];
    const listed = todaySessions(sessions, now, [
      exception({
        sessionId: "a",
        type: "moved",
        startTime: "13:00",
        endTime: "14:00",
        room: "R2",
      }),
    ]);
    const row = listed[0];
    expect(row.startTime).toBe("13:00");
    expect(row.endTime).toBe("14:00");
    expect(row.room).toBe("R2");
    expect(row.finished).toBe(false);
  });

  it("keeps the original time when a move carries no explicit times", () => {
    const sessions = [session({ id: "a", dayOfWeek: 0, startTime: "09:00", endTime: "10:00" })];
    const listed = todaySessions(sessions, now, [
      exception({ sessionId: "a", type: "moved", startTime: null, endTime: null }),
    ]);
    expect(listed[0].startTime).toBe("09:00");
    expect(listed[0].endTime).toBe("10:00");
    expect(listed[0].finished).toBe(true);
  });
});
