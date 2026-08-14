import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  countNewStudents,
  currentMonth,
  lastMonths,
  monthWindow,
  percentDelta,
  previousMonth,
  timeToMinutes,
  topWeaknessStudents,
  type WeaknessRow,
} from "./dashboard-helpers";

describe("timeToMinutes", () => {
  it("converts HH:mm to minutes since midnight", () => {
    expect(timeToMinutes("08:15")).toBe(495);
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("currentMonth / previousMonth / lastMonths", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 10));
  });
  afterEach(() => vi.useRealTimers());

  it("returns the ISO month key for now", () => {
    expect(currentMonth()).toBe("2026-05");
    expect(previousMonth()).toBe("2026-04");
  });

  it("rolls across the year boundary", () => {
    vi.setSystemTime(new Date(2026, 0, 15));
    expect(previousMonth()).toBe("2025-12");
  });

  it("lists the last n months oldest-first", () => {
    expect(lastMonths(3)).toEqual(["2026-03", "2026-04", "2026-05"]);
    expect(lastMonths(1)).toEqual(["2026-05"]);
  });
});

describe("percentDelta", () => {
  it("computes the rounded percentage change", () => {
    expect(percentDelta(120, 100)).toBe(20);
    expect(percentDelta(50, 100)).toBe(-50);
    expect(percentDelta(0, 100)).toBe(-100);
  });

  it("returns null when the previous value is zero", () => {
    expect(percentDelta(120, 0)).toBeNull();
    expect(percentDelta(0, 0)).toBeNull();
  });
});

describe("monthWindow", () => {
  it("returns [start, end) unix-ms bounds for an ISO month", () => {
    const { start, end } = monthWindow("2026-05");
    expect(start).toBe(Date.parse("2026-05-01T00:00:00"));
    expect(end).toBe(Date.parse("2026-06-01T00:00:00"));
  });
});

describe("countNewStudents", () => {
  it("counts students enrolled inside the month window", () => {
    const students = [
      { enrolledOn: "2026-05-04", createdAt: 0 },
      { enrolledOn: "2026-04-30", createdAt: 0 },
      { enrolledOn: "2026-06-01", createdAt: 0 },
    ];
    expect(countNewStudents(students, "2026-05")).toBe(1);
  });

  it("falls back to createdAt for legacy rows without enrolledOn", () => {
    const students = [{ enrolledOn: null, createdAt: Date.parse("2026-05-02T00:00:00") }];
    expect(countNewStudents(students, "2026-05")).toBe(1);
  });
});

describe("topWeaknessStudents", () => {
  const rows: WeaknessRow[] = [
    { studentId: "s1", description: "القسمة", recordedOn: 100, resolved: false },
    { studentId: "s1", description: "الضرب", recordedOn: 200, resolved: false },
    { studentId: "s1", description: "قديمة", recordedOn: 50, resolved: true },
    { studentId: "s2", description: "القراءة", recordedOn: 300, resolved: false },
    { studentId: "s3", description: "محلولة", recordedOn: 400, resolved: true },
  ];
  const students = [
    { id: "s1", name: "علي" },
    { id: "s2", name: "سارة" },
    { id: "s3", name: "محمد" },
  ];

  it("keeps only unresolved weaknesses and picks the latest per student", () => {
    const result = topWeaknessStudents(rows, students);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "s1", name: "علي", count: 2, latest: "الضرب" });
    expect(result[1]).toEqual({ id: "s2", name: "سارة", count: 1, latest: "القراءة" });
  });

  it("sorts by count descending and caps the list at the limit", () => {
    const result = topWeaknessStudents(rows, students, 1);
    expect(result).toEqual([{ id: "s1", name: "علي", count: 2, latest: "الضرب" }]);
  });

  it("returns an empty list when nothing is unresolved", () => {
    const result = topWeaknessStudents(rows.filter((r) => r.resolved), students);
    expect(result).toEqual([]);
  });
});
