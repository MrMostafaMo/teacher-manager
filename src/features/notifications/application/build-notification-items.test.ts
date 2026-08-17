import { describe, expect, it } from "vitest";
import type { HomeworkListItem } from "@/features/homework/application/homework-cases";
import type { DuesRow } from "@/features/payments/application/payment-cases";
import type { SessionException } from "@/lib/db/schema";
import type { SkillWithWeakCount } from "@/features/skills/infrastructure/skill-repo";
import type { StudentMonthlyRow } from "@/features/attendance/application/attendance-cases";
import { buildNotificationItems, type NotificationSourceData } from "./build-notification-items";

const month = "2026-08";
const today = "2026-08-13";

function homework(overrides: Partial<HomeworkListItem> = {}): HomeworkListItem {
  return {
    id: "h1",
    groupId: "g1",
    title: "Algebra p.40",
    description: null,
    dueDate: "2026-08-10",
    submitted: 1,
    pending: 2,
    late: 0,
    completion: 33,
    overdue: true,
    groupName: "Group A",
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}
function due(overrides: Partial<DuesRow> = {}): DuesRow {
  return {
    student: {
      id: "st1",
      name: "Ahmed",
      phone: null,
      guardianName: null,
      guardianPhone: null,
      status: "active",
      notes: null,
      planId: null,
      enrolledOn: "2026-07-01",
      birthDate: null,
      gradeLevel: null,
      photoUrl: null,
      createdAt: 0,
      updatedAt: 0,
    },
    plan: null,
    due: 300,
    paid: 100,
    remaining: 200,
    groups: [],
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
  return { homeworks: [], exams: [], dues: [], exceptions: [], skills: [], monthly: [], students: [] };
}

describe("buildNotificationItems", () => {
  it("generates homework items only for overdue homework", () => {
    const items = buildNotificationItems(
      { ...empty(), homeworks: [homework(), homework({ id: "h2", overdue: false })] },
      month,
      today,
    );
    expect(items.map((i) => i.key)).toEqual(["homework:h1"]);
    expect(items[0].details.title).toBe("Algebra p.40");
  });

  it("generates payment items for students with remaining dues", () => {
    const items = buildNotificationItems(
      {
        ...empty(),
        dues: [
          due(),
          due({ student: { ...due().student, id: "st2", name: "Sara" }, remaining: 0 }),
        ],
      },
      month,
      today,
    );
    expect(items.map((i) => i.key)).toEqual(["payment:st1:2026-08"]);
    expect(items[0].details.remaining).toBe(200);
  });

  it("keeps only upcoming schedule exceptions", () => {
    const items = buildNotificationItems(
      {
        ...empty(),
        exceptions: [
          exception(),
          exception({
            id: "e2",
            date: "2026-08-10",
            type: "moved",
            startTime: "11:00",
            endTime: "12:00",
            room: "R2",
          }),
        ],
      },
      month,
      today,
    );
    expect(items.map((i) => i.key)).toEqual(["exception:e1"]);
    expect(items[0].details.kind).toBe("cancelled");
  });

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
          monthly(), // 4/10 → 40%
          monthly({ studentId: "st2", name: "Sara", present: 7, absent: 3 }), // 70% → excluded
          monthly({ studentId: "st3", name: "Lina", present: 0, absent: 0, late: 0, excused: 0 }), // no marks
        ],
      },
      month,
      today,
    );
    expect(items.map((i) => i.key)).toEqual(["attendance:st1:2026-08"]);
    expect(items[0].details.rate).toBe(0.4);
  });
});
