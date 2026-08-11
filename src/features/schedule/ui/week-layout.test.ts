import { describe, expect, it } from "vitest";
import type { SessionWithGroup } from "@/features/schedule/infrastructure/schedule-repo";
import {
  MAX_BLOCK_H,
  MIN_BLOCK_H,
  PALETTE,
  layoutDay,
  minBlockHeight,
  paletteFor,
  rangeFor,
  toLabel,
  toMin,
  weekDates,
} from "./week-layout";

const session = (overrides: Partial<SessionWithGroup> = {}): SessionWithGroup => ({
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
});
describe("toMin", () => {
  it("converts HH:mm to minutes since midnight", () => {
    expect(toMin("00:00")).toBe(0);
    expect(toMin("07:30")).toBe(450);
    expect(toMin("23:59")).toBe(1439);
  });
});

describe("toLabel", () => {
  it("formats minutes as an on-the-hour HH:00 label", () => {
    expect(toLabel(0)).toBe("00:00");
    expect(toLabel(450)).toBe("07:00");
    expect(toLabel(1410)).toBe("23:00");
  });
});
describe("minBlockHeight", () => {
  it("grows with the line count between floor and cap", () => {
    expect(minBlockHeight(0)).toBe(MIN_BLOCK_H);
    expect(minBlockHeight(1)).toBe(28);
    expect(minBlockHeight(2)).toBe(42);
    expect(minBlockHeight(3)).toBe(52);
    expect(minBlockHeight(9)).toBe(MAX_BLOCK_H);
  });
});
describe("rangeFor", () => {
  it("falls back to the default window with no sessions", () => {
    expect(rangeFor([[], [], [], [], [], [], []])).toEqual([420, 1320]);
  });
  it("rounds down the start and up the end to full hours", () => {
    const day = [session({ startTime: "08:30", endTime: "12:20" })];
    expect(rangeFor([day, [], [], [], [], [], []])).toEqual([480, 1080]);
  });
  it("enforces a minimum visible span for short windows", () => {
    const day = [session({ startTime: "10:00", endTime: "11:00" })];
    expect(rangeFor([day, [], [], [], [], [], []])).toEqual([600, 1200]);
  });
  it("keeps a wide-enough span untouched", () => {
    const day = [session({ startTime: "07:30", endTime: "18:45" })];
    expect(rangeFor([day, [], [], [], [], [], []])).toEqual([420, 1140]);
  });
});
describe("weekDates", () => {
  it("anchors the week on the configured first day", () => {
    const now = new Date(2026, 4, 13); // Wednesday
    const sunWeek = weekDates(now, 0);
    expect(sunWeek).toHaveLength(7);
    expect(sunWeek[0].getDate()).toBe(10);
    expect(sunWeek[3].getDate()).toBe(13);
    expect(sunWeek[6].getDate()).toBe(16);
    const satWeek = weekDates(now, 6);
    expect(satWeek[0].getDate()).toBe(9);
    expect(satWeek[4].getDate()).toBe(13);
    expect(satWeek[6].getDate()).toBe(15);
  });
  it("shifts by whole weeks with an offset", () => {
    const now = new Date(2026, 4, 13);
    const next = weekDates(now, 0, 1);
    expect(next[0].getDate()).toBe(17);
    expect(next[6].getDate()).toBe(23);
  });
  it("keeps all dates at midnight", () => {
    const now = new Date(2026, 4, 13, 15, 30, 45);
    for (const d of weekDates(now, 0)) {
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    }
  });
});
describe("layoutDay", () => {
  it("gives non-overlapping sessions full width", () => {
    const placed = layoutDay([
      session({ id: "a", startTime: "09:00", endTime: "10:00" }),
      session({ id: "b", startTime: "10:00", endTime: "11:00" }),
    ]);
    expect(placed.map((p) => [p.session.id, p.col, p.cols])).toEqual([
      ["a", 0, 1],
      ["b", 0, 1],
    ]);
  });
  it("splits two overlapping sessions across columns", () => {
    const placed = layoutDay([
      session({ id: "a", startTime: "09:00", endTime: "10:00" }),
      session({ id: "b", startTime: "09:30", endTime: "10:30" }),
    ]);
    expect(placed.map((p) => [p.session.id, p.cols])).toEqual([
      ["a", 2],
      ["b", 2],
    ]);
    expect(placed.map((p) => p.col).sort()).toEqual([0, 1]);
  });
  it("counts columns per session, not just the global maximum", () => {
    const placed = layoutDay([
      session({ id: "a", startTime: "09:00", endTime: "11:00" }),
      session({ id: "b", startTime: "10:00", endTime: "12:00" }),
      session({ id: "c", startTime: "12:30", endTime: "13:30" }),
    ]);
    const byId = Object.fromEntries(placed.map((p) => [p.session.id, p.cols]));
    expect(byId.a).toBe(2);
    expect(byId.b).toBe(2);
    expect(byId.c).toBe(1);
  });
  it("lets a later session reuse a column freed by an earlier one", () => {
    const placed = layoutDay([
      session({ id: "a", startTime: "09:00", endTime: "11:00" }),
      session({ id: "b", startTime: "09:30", endTime: "10:00" }),
      session({ id: "c", startTime: "10:30", endTime: "11:30" }),
    ]);
    expect(placed.find((p) => p.session.id === "c")?.col).toBe(1);
  });
});
describe("paletteFor", () => {
  it("is deterministic and always in range", () => {
    const a = paletteFor("group-1");
    const b = paletteFor("group-1");
    expect(a).toBe(b);
    expect(PALETTE).toContain(a);
    expect(PALETTE).toContain(paletteFor("gA"));
    expect(PALETTE).toContain(paletteFor("gB"));
  });
});
