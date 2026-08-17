import { describe, expect, it } from "vitest";
import { isDirty, markAllPresent } from "./attendance-bulk";

const students = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("markAllPresent", () => {
  it("sets every listed student to present", () => {
    const draft = markAllPresent({ a: "absent", c: "late" }, students);
    expect(draft).toEqual({ a: "present", b: "present", c: "present" });
  });

  it("keeps statuses of students that disappear from the roster", () => {
    const draft = markAllPresent({ z: "excused", a: "absent" }, students);
    expect(draft.z).toBe("excused");
  });

  it("does not mutate the input draft", () => {
    const input: Record<string, "absent"> = { a: "absent" };
    markAllPresent(input, students);
    expect(input.a).toBe("absent");
  });

  it("returns a fresh object even when nothing changes", () => {
    const input = { a: "present" as const };
    const next = markAllPresent(input, students);
    expect(next).not.toBe(input);
  });
});

describe("isDirty", () => {
  it("is false when every student matches their saved status", () => {
    const draft = { a: "present", b: "late", c: undefined } as const;
    const saved = { a: "present", b: "late", c: undefined } as const;
    expect(isDirty(draft, saved, students)).toBe(false);
  });

  it("is true when a student differs from their saved status", () => {
    const draft = { a: "present", b: "absent", c: undefined } as const;
    const saved = { a: "present", b: "late", c: undefined } as const;
    expect(isDirty(draft, saved, students)).toBe(true);
  });

  it("is true when a saved status was cleared in the draft", () => {
    const draft = { a: "present", b: undefined, c: undefined } as const;
    const saved = { a: "present", b: "late", c: undefined } as const;
    expect(isDirty(draft, saved, students)).toBe(true);
  });
});
