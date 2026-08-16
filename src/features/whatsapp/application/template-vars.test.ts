import { describe, expect, it } from "vitest";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import { buildTemplateVars } from "./template-vars";

function profile(overrides: Partial<StudentProfileData> = {}): StudentProfileData {
  return {
    student: { id: "s1", name: "علي", status: "active" } as StudentProfileData["student"],
    planName: "خطة شهرية",
    groups: [{ id: "g1", name: "مجموعة أ" }],
    attendanceStats: { present: 8, absent: 1, late: 1, excused: 0 } as StudentProfileData["attendanceStats"],
    attendanceHistory: [],
    payments: [],
    homeworks: [],
    exams: [],
    sessionAttendance: [],
    skills: [],
    weakPoints: [],
    activity: [],
    balance: 0,
    ...overrides,
  };
}

describe("buildTemplateVars", () => {
  it("fills general variables", () => {
    const vars = buildTemplateVars(profile());
    expect(vars.name).toBe("علي");
    expect(vars.group).toBe("مجموعة أ");
    expect(vars.plan).toBe("خطة شهرية");
    expect(vars.date).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });

  it("uses the guardian name when present and a dash otherwise", () => {
    const withGuardian = profile({
      student: { id: "s1", name: "علي", guardianName: "أحمد", status: "active" } as StudentProfileData["student"],
    });
    expect(buildTemplateVars(withGuardian).guardianName).toBe("أحمد");
    expect(buildTemplateVars(profile()).guardianName).toBe("—");
  });

  it("provides every variable regardless of the selected template", () => {
    const data = profile({
      homeworks: [
        { status: "done" },
        { status: "done" },
        { status: "pending" },
      ] as StudentProfileData["homeworks"],
      exams: [{ score: 80 }, { score: null }] as StudentProfileData["exams"],
      skills: [{ name: "القراءة", weak: true, level: 1 }] as StudentProfileData["skills"],
    });
    const vars = buildTemplateVars(data);
    expect(vars.homeworkDone).toBe("2");
    expect(vars.homeworkTotal).toBe("3");
    expect(vars.homeworkRate).toBe("67%");
    expect(vars.examAverage).toBe("80%");
    expect(vars.examsCount).toBe("1");
    expect(vars.weakSkills).toBe("القراءة");
    expect(vars.skillsCount).toBe("1");
  });

  it("uses a dash when there is no data", () => {
    const vars = buildTemplateVars(profile());
    expect(vars.homeworkDone).toBe("0");
    expect(vars.homeworkRate).toBe("—");
    expect(vars.examAverage).toBe("—");
    expect(vars.examsCount).toBe("0");
    expect(vars.weakSkills).toBe("—");
    expect(vars.strongSkills).toBe("—");
    expect(vars.skillsCount).toBe("0");
  });
});