import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { currentMonth, lastMonths, monthWindow, shiftMonth } from "./months";

describe("currentMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 10));
  });
  afterEach(() => vi.useRealTimers());

  it("returns the ISO month key for now", () => {
    expect(currentMonth()).toBe("2026-05");
  });
});

describe("shiftMonth", () => {
  it("shifts a month key by a signed delta", () => {
    expect(shiftMonth("2026-05", -1)).toBe("2026-04");
    expect(shiftMonth("2026-05", 2)).toBe("2026-07");
  });

  it("rolls across the year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});

describe("lastMonths", () => {
  it("lists the last n months ending at a given month, oldest first", () => {
    expect(lastMonths(3, "2026-05")).toEqual(["2026-03", "2026-04", "2026-05"]);
    expect(lastMonths(2, "2026-01")).toEqual(["2025-12", "2026-01"]);
    expect(lastMonths(1, "2026-05")).toEqual(["2026-05"]);
  });
});

describe("monthWindow", () => {
  it("returns [start, end) unix-ms bounds for an ISO month", () => {
    const { start, end } = monthWindow("2026-05");
    expect(start).toBe(Date.parse("2026-05-01T00:00:00"));
    expect(end).toBe(Date.parse("2026-06-01T00:00:00"));
  });
});
