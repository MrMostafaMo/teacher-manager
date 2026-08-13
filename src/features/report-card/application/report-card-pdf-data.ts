import { formatDateString } from "@/lib/utils/format";
import { attendanceRate, type ReportCardData } from "./report-card-data";

export interface ReportCardLabels {
  title: string;
  footer: string;
  group: string;
  enrolled: string;
  attendance: string;
  homework: string;
  exams: string;
  weakSkills: string;
  notes: string;
  none: string;
  present: string;
  absent: string;
  late: string;
  excused: string;
  rate: string;
}

export interface ReportCardExamRow {
  name: string;
  value: string;
}

export interface ReportCardPdfData {
  rtl: boolean;
  title: string;
  footer: string;
  studentName: string;
  groupLabel: string;
  groupValue: string;
  enrolledLabel: string;
  enrolledValue: string;
  attendanceLabel: string;
  attendanceValue: string;
  homeworkLabel: string;
  homeworkValue: string;
  examTitle: string;
  examEmpty: string;
  examRows: ReportCardExamRow[];
  weakSkillsLabel: string;
  weakSkillsValue: string;
  notesLabel: string;
  notesValue: string;
}

/** Localize and shape the report-card data for the PDF exporter. */
export function buildReportCardPdfData(
  data: ReportCardData,
  labels: ReportCardLabels,
  rtl: boolean,
): ReportCardPdfData {
  const a = data.attendance;
  const attendanceValue = `${a.present} ${labels.present} · ${a.absent} ${labels.absent} · ${a.late} ${labels.late} · ${a.excused} ${labels.excused} — ${labels.rate} ${attendanceRate(a)}%`;
  const hwRate = data.homeworkTotal
    ? Math.round((data.homeworkDone / data.homeworkTotal) * 100)
    : 0;
  return {
    rtl,
    title: labels.title,
    footer: labels.footer,
    studentName: data.studentName,
    groupLabel: labels.group,
    groupValue: data.groupNames.length ? data.groupNames.join("، ") : labels.none,
    enrolledLabel: labels.enrolled,
    enrolledValue: data.enrolledOn ? formatDateString(data.enrolledOn) : labels.none,
    attendanceLabel: labels.attendance,
    attendanceValue,
    homeworkLabel: labels.homework,
    homeworkValue: `${data.homeworkDone} / ${data.homeworkTotal} (${hwRate}%)`,
    examTitle: labels.exams,
    examEmpty: labels.none,
    examRows: data.exams.map((e) => ({ name: e.title, value: `${e.score}/${e.maxScore}` })),
    weakSkillsLabel: labels.weakSkills,
    weakSkillsValue: data.weakSkills.length ? data.weakSkills.join("، ") : labels.none,
    notesLabel: labels.notes,
    notesValue: data.notes?.trim() || labels.none,
  };
}
