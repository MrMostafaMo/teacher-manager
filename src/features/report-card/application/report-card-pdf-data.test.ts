import { describe, expect, it } from "vitest";
import { buildReportCardPdfData, type ReportCardLabels } from "./report-card-pdf-data";
import type { ReportCardData } from "./report-card-data";

const labels: ReportCardLabels = {
  title: "بطاقة تقرير الطالب",
  footer: "أُعدت بواسطة إدارة الدروس",
  group: "المجموعة",
  enrolled: "تاريخ التسجيل",
  attendance: "الحضور",
  homework: "الواجبات",
  exams: "الامتحانات",
  weakSkills: "المهارات الضعيفة",
  notes: "ملاحظات",
  none: "لا يوجد",
  present: "حاضر",
  absent: "غائب",
  late: "متأخر",
  excused: "معذور",
  rate: "النسبة",
};

function data(over: Partial<ReportCardData>): ReportCardData {
  return {
    studentName: "أحمد",
    groupNames: ["مجموعة أ"],
    enrolledOn: "2026-08-01",
    notes: "متميز",
    attendance: { studentId: "s1", present: 8, absent: 2, late: 1, excused: 1 },
    homeworkTotal: 3,
    homeworkDone: 2,
    exams: [{ title: "منتصف الفصل", score: 18, maxScore: 20 }],
    weakSkills: ["الإملاء"],
    ...over,
  };
}

describe("buildReportCardPdfData", () => {
  it("composes attendance and homework summaries", () => {
    const p = buildReportCardPdfData(data({}), labels, true);
    expect(p.attendanceLabel).toBe("الحضور");
    expect(p.attendanceValue).toContain("8 حاضر");
    expect(p.attendanceValue).toContain("2 غائب");
    expect(p.attendanceValue).toContain("83%");
    expect(p.homeworkValue).toBe("2 / 3 (67%)");
  });

  it("joins group names and falls back to none", () => {
    expect(buildReportCardPdfData(data({}), labels, true).groupValue).toBe("مجموعة أ");
    expect(buildReportCardPdfData(data({ groupNames: [] }), labels, true).groupValue).toBe("لا يوجد");
  });

  it("formats enrolled date and falls back to none", () => {
    expect(buildReportCardPdfData(data({}), labels, true).enrolledValue).toBe("01-08-2026");
    expect(buildReportCardPdfData(data({ enrolledOn: null }), labels, true).enrolledValue).toBe("لا يوجد");
  });

  it("maps exam rows and weak-skills list", () => {
    const p = buildReportCardPdfData(data({}), labels, true);
    expect(p.examRows).toEqual([{ name: "منتصف الفصل", value: "18/20" }]);
    expect(p.weakSkillsValue).toBe("الإملاء");
    expect(buildReportCardPdfData(data({ weakSkills: [] }), labels, true).weakSkillsValue).toBe("لا يوجد");
  });

  it("falls back notes to none when empty", () => {
    expect(buildReportCardPdfData(data({ notes: "  " }), labels, true).notesValue).toBe("لا يوجد");
  });
});
