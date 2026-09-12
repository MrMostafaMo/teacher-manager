import { describe, expect, it } from "vitest";
import type { SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import type { StudentMonthlyRow } from "@/features/attendance/application/attendance-cases";
import { buildNotificationItems, type NotificationSourceData } from "./build-notification-items";

const month = "2026-08";
const today = "2026-08-13";

function skill(overrides: Partial<SkillWithWeakCount> = {}): SkillWithWeakCount {
  return {
    id: "k1",
    name: "Fractions",
    weakCount: 3,
    trackedCount: 5,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function monthly(overrides: Partial<StudentMonthlyRow> = {}): StudentMonthlyRow {
  return {
    studentId: "st1",
    name: "Ahmed",
    present: 4,
    absent: 6,
    late: 0,
    excused: 0,
    ...overrides,
  };
}

function empty(): NotificationSourceData {
  return {
    homeworks: [],
    exams: [],
    dues: [],
    exceptions: [],
    oneOffs: [],
    skills: [],
    monthly: [],
    students: [],
  };
}

describe("buildNotificationItems extras", () => {
  it("generates weak-skill items for skills with weakCount > 0", () => {
    const items = buildNotificationItems(
      { ...empty(), skills: [skill(), skill({ id: "k2", weakCount: 0 })] },
      month,
      today,
    );
    expect(items.map((i) => i.key)).toEqual(["weak:k1"]);
  });

  it("flags low attendance below 70% with at least one marked day", () => {
    const items = buildNotificationItems(
      {
        ...empty(),
        monthly: [
          monthly(),
          monthly({ studentId: "st2", name: "Sara", present: 7, absent: 3 }),
          monthly({ studentId: "st3", name: "Lina", present: 0, absent: 0, late: 0, excused: 0 }),
        ],
      },
      month,
      today,
    );
    expect(items.map((i) => i.key)).toEqual(["attendance:st1:2026-08"]);
    expect(items[0].details.rate).toBe(0.4);
  });
});
