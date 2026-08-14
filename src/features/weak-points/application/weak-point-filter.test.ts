import { describe, expect, it } from "vitest";
import { filterWeakPoints, type WeakPointStatusFilter } from "./weak-point-filter";
import type { StudentWeakPoint } from "./weak-point-cases";

function row(id: string, studentId: string, description: string, resolved: boolean): StudentWeakPoint {
  return { id, studentId, description, recordedOn: 1_700_000_000_000, resolved } as StudentWeakPoint;
}

const rows = [
  row("a", "s1", "المعادلات", false),
  row("b", "s1", "الإملاء", true),
  row("c", "s2", "long division", false),
];

const studentName = (id: string) => (id === "s1" ? "أحمد محمد" : "Youssef");

describe("filterWeakPoints", () => {
  it("keeps everything when status is all", () => {
    expect(filterWeakPoints(rows, "all", "", studentName)).toHaveLength(3);
  });

  it("keeps only active rows", () => {
    const out = filterWeakPoints(rows, "active", "", studentName);
    expect(out.map((r) => r.id)).toEqual(["a", "c"]);
  });

  it("keeps only resolved rows", () => {
    const out = filterWeakPoints(rows, "resolved", "", studentName);
    expect(out.map((r) => r.id)).toEqual(["b"]);
  });

  it("matches description case-insensitively", () => {
    const out = filterWeakPoints(rows, "all", "LONG DIVISION", studentName);
    expect(out.map((r) => r.id)).toEqual(["c"]);
  });

  it("matches student name", () => {
    const out = filterWeakPoints(rows, "all", "youssef", studentName);
    expect(out.map((r) => r.id)).toEqual(["c"]);
  });

  it("combines status and query", () => {
    const out = filterWeakPoints(rows, "active", "أحمد", studentName);
    expect(out.map((r) => r.id)).toEqual(["a"]);
  });

  it("trims the query", () => {
    const out = filterWeakPoints(rows, "all", "  division  ", studentName);
    expect(out.map((r) => r.id)).toEqual(["c"]);
  });

  it("returns nothing on no match", () => {
    expect(filterWeakPoints(rows, "all", "zzz", studentName)).toHaveLength(0);
  });

  it("handles unknown student id gracefully", () => {
    const out = filterWeakPoints([row("x", "nobody", "وصف", false)], "all", "وصف", studentName);
    expect(out).toHaveLength(1);
  });

  it("accepts any status value without throwing", () => {
    expect(filterWeakPoints(rows, "all" as WeakPointStatusFilter, "", studentName)).toHaveLength(3);
  });
});