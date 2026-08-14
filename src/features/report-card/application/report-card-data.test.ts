import { describe, expect, it } from "vitest";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import { attendanceRate, buildReportCardData } from "./report-card-data";

function profile(over: Partial<StudentProfileData>): StudentProfileData {
  const student = {
    id: "s1",
    name: "أحمد",
    enrolledOn: "2026-08-01",
    notes: "متميز",
    status: "active",
    createdAt: 1,
    updatedAt: 1,
  } as unknown as StudentProfileData["student"];
  return {
    student,
    planName: null,
    groups: [{ id: "g1", name: "مجموعة أ" }],
    attendanceStats: { studentId: "s1", present: 8, absent: 2, late: 1, excused: 1 },
    attendanceHistory: [],
    payments: [],
    homeworks: [],
    exams: [],
    sessionAttendance: [],
    skills: [],
    weakPoints: [],
    activity: [],
    ...over,
  };
}

describe("buildReportCardData", () => {
  it("copies identity fields and group names", () => {
    const d = buildReportCardData(profile({}));
    expect(d.studentName).toBe("أحمد");
    expect(d.groupNames).toEqual(["مجموعة أ"]);
    expect(d.enrolledOn).toBe("2026-08-01");
    expect(d.notes).toBe("متميز");
  });

  it("counts homework done as submitted or late only", () => {
    const d = buildReportCardData(
      profile({
        homeworks: [
          { status: "submitted" },
          { status: "late" },
          { status: "pending" },
        ] as unknown as StudentProfileData["homeworks"],
      }),
    );
    expect(d.homeworkTotal).toBe(3);
    expect(d.homeworkDone).toBe(2);
  });

  it("keeps only scored exams with title and maxScore", () => {
    const d = buildReportCardData(
      profile({
        exams: [
          { title: "منتصف الفصل", score: 18, maxScore: 20 },
          { title: "غير مصحح", score: null, maxScore: 20 },
        ] as unknown as StudentProfileData["exams"],
      }),
    );
    expect(d.exams).toEqual([{ title: "منتصف الفصل", score: 18, maxScore: 20 }]);
  });

  it("maps weak skills to names", () => {
    const d = buildReportCardData(
      profile({
        skills: [
          { name: "الإملاء", weak: true, skillId: "k1", level: 2, note: null },
          { name: "القراءة", weak: false, skillId: "k2", level: 4, note: null },
        ] as unknown as StudentProfileData["skills"],
      }),
    );
    expect(d.weakSkills).toEqual(["الإملاء"]);
  });

  it("attendanceRate treats present+late+excused as attended", () => {
    expect(attendanceRate({ present: 8, absent: 2, late: 1, excused: 1 })).toBe(83);
    expect(attendanceRate({ present: 0, absent: 0, late: 0, excused: 0 })).toBe(0);
  });
});
