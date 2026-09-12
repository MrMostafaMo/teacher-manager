import { describe, expect, it } from "vitest";
import type { HomeworkListItem } from "@/features/homework/application/homework-cases";
import type { DuesRow } from "@/features/payments/application/payment-cases";
import type { SessionException } from "@/lib/db/schema";
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
      isExempt: false,
      exemptReason: null,
      exemptNote: null,
      createdAt: 0,
      updatedAt: 0,
    } as unknown as DuesRow["student"],
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

function oneOff(id: string, oneOffDate: string): NotificationSourceData["oneOffs"][number] {
  return {
    id, groupId: "g1", groupName: "Group A", groupStatus: "active", groupStartsOn: null,
    dayOfWeek: 4, startTime: "12:00", endTime: "13:00", room: null, oneOffDate,
    movedFromSessionId: null, movedFromDate: null, createdAt: 0, updatedAt: 0,
  };
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

  it("generates items for upcoming one-off sessions only", () => {
    const items = buildNotificationItems(
      { ...empty(), oneOffs: [oneOff("o1", "2026-08-14"), oneOff("o2", "2026-08-01")] },
      month,
      today,
    );
    expect(items.map((i) => i.key)).toEqual(["oneoff:o1"]);
    expect(items[0].details.kind).toBe("added");
    expect(items[0].details.groupName).toBe("Group A");
  });

});
