import { describe, expect, it } from "vitest";
import type { SessionException } from "@/lib/db/schema";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-queries";
import {
  applyExceptions,
  conflictIds,
  upcomingExceptions,
  type SessionWithException,
} from "./schedule-exceptions";

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

describe("applyExceptions", () => {
  it("returns the buckets unchanged when there are no exceptions", () => {
    const byDay = [[session({ id: "s1" })]];
    const out = applyExceptions(byDay, [], [new Date(2026, 7, 13)]);
    expect(out).toEqual(byDay);
  });

  it("flags a cancelled occurrence in place", () => {
    const s = session({ id: "s1" });
    const out = applyExceptions([[s]], [exception()], [new Date(2026, 7, 13)]);
    expect(out[0][0]).not.toBe(s);
    expect(out[0][0].exception).toEqual({
      id: "e1",
      type: "cancelled",
      date: "2026-08-13",
      startTime: null,
      endTime: null,
      room: null,
    });
    expect((out[0][0] as SessionWithException).startTime).toBe("10:00");
  });

  it("repositions a moved occurrence to its effective time", () => {
    const s = session({ id: "s1" });
    const out = applyExceptions(
      [[s]],
      [exception({ type: "moved", startTime: "14:00", endTime: "15:00", room: "R2" })],
      [new Date(2026, 7, 13)],
    );
    const moved = out[0][0] as SessionWithException;
    expect(moved.startTime).toBe("14:00");
    expect(moved.endTime).toBe("15:00");
    expect(moved.room).toBe("R2");
    expect(moved.exception).toEqual({
      id: "e1",
      type: "moved",
      date: "2026-08-13",
      startTime: "14:00",
      endTime: "15:00",
      room: "R2",
    });
  });

  it("keeps the original room when a move omits one", () => {
    const s = session({ id: "s1" });
    const out = applyExceptions(
      [[s]],
      [exception({ type: "moved", startTime: "14:00", endTime: "15:00", room: null })],
      [new Date(2026, 7, 13)],
    );
    expect((out[0][0] as SessionWithException).room).toBe("R1");
  });

  it("only affects the matching (session, date) pair", () => {
    const a = session({ id: "s1" });
    const b = session({ id: "s2" });
    const out = applyExceptions(
      [[a], [b]],
      [exception()],
      [new Date(2026, 7, 13), new Date(2026, 7, 14)],
    );
    expect(out[0][0]).not.toBe(a);
    expect(out[1][0]).toBe(b);
  });

  it("matches the exception only on its exact date", () => {
    const s = session({ id: "s1" });
    // 2026-08-12 — the exception targets 2026-08-13.
    const out = applyExceptions([[s]], [exception()], [new Date(2026, 7, 12)]);
    expect(out[0][0]).toBe(s);
  });
});

describe("conflictIds", () => {
  it("flags two overlapping sessions in the same room", () => {
    const a = session({ id: "a", startTime: "10:00", endTime: "11:00", room: "R1" });
    const b = session({ id: "b", startTime: "10:30", endTime: "11:30", room: "R1" });
    expect(conflictIds([[a, b]])).toEqual(new Set(["a", "b"]));
  });

  it("ignores back-to-back or disjoint sessions in the same room", () => {
    const a = session({ id: "a", startTime: "10:00", endTime: "11:00", room: "R1" });
    const b = session({ id: "b", startTime: "11:00", endTime: "12:00", room: "R1" });
    expect(conflictIds([[a, b]])).toEqual(new Set());
  });

  it("ignores different rooms", () => {
    const a = session({ id: "a", startTime: "10:00", endTime: "11:00", room: "R1" });
    const b = session({ id: "b", startTime: "10:30", endTime: "11:30", room: "R2" });
    expect(conflictIds([[a, b]])).toEqual(new Set());
  });

  it("does not compare sessions across days", () => {
    const a = session({ id: "a", startTime: "10:00", endTime: "11:00", room: "R1" });
    const b = session({ id: "b", startTime: "10:30", endTime: "11:30", room: "R1" });
    expect(conflictIds([[a], [b]])).toEqual(new Set());
  });
});

describe("upcomingExceptions", () => {
  it("returns empty array when no exceptions match the session", () => {
    expect(upcomingExceptions([], "s1", "2026-08-16")).toEqual([]);
  });
  it("groups cancelled and moved exceptions, dates >= today only", () => {
    const exs: SessionException[] = [
      exception({ id: "e1", sessionId: "s1", date: "2026-08-15", type: "cancelled" }),
      exception({ id: "e2", sessionId: "s1", date: "2026-08-18", type: "moved" }),
      exception({ id: "e3", sessionId: "s1", date: "2026-08-20", type: "cancelled" }),
      exception({ id: "e4", sessionId: "s1", date: "2026-08-10", type: "cancelled" }),
    ];
    const result = upcomingExceptions(exs, "s1", "2026-08-16");
    expect(result).toEqual([
      { type: "cancelled", count: 1, dates: ["2026-08-20"] },
      { type: "moved", count: 1, dates: ["2026-08-18"] },
    ]);
  });
  it("does not include exceptions for other sessions", () => {
    const exs = [exception({ id: "e1", sessionId: "s2", date: "2026-08-18" })];
    expect(upcomingExceptions(exs, "s1", "2026-08-16")).toEqual([]);
  });
  it("sorts dates within each type ascending", () => {
    const exs: SessionException[] = [
      exception({ id: "e1", sessionId: "s1", date: "2026-08-25", type: "cancelled" }),
      exception({ id: "e2", sessionId: "s1", date: "2026-08-18", type: "cancelled" }),
    ];
    const result = upcomingExceptions(exs, "s1", "2026-08-16");
    expect(result[0].dates).toEqual(["2026-08-18", "2026-08-25"]);
  });
});
