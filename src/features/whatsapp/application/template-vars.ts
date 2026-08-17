import dayjs from "dayjs";
import type { StudentProfileData } from "@/features/student-profile/application/student-profile-cases";
import { computeProfileSummary } from "@/features/student-profile/application/profile-summary";
import { formatNumber } from "@/lib/utils/format";
import type { WhatsAppVars } from "../domain";

const DASH = "—";

/** "85%" or a dash when there is no data yet. */
function pct(value: number | null): string {
  return value === null ? DASH : `${formatNumber(value)}%`;
}

/** Build the full variable set (all variables) from already-loaded data. */
export function buildTemplateVars(data: StudentProfileData): WhatsAppVars {
  const summary = computeProfileSummary(data);
  const gradedExams = data.exams.filter((e) => e.score !== null);
  const homeworkDone = data.homeworks.filter((h) => h.status !== "pending").length;
  const weak = data.skills.filter((s) => s.weak).map((s) => s.name);
  const strong = data.skills.filter((s) => !s.weak && s.level !== null).map((s) => s.name);

  return {
    name: data.student.name,
    guardianName: data.student.guardianName ?? DASH,
    group: data.groups.length > 0 ? data.groups.map((g) => g.name).join("، ") : DASH,
    plan: data.planName ?? DASH,
    date: dayjs().format("DD-MM-YYYY"),
    homeworkDone: formatNumber(homeworkDone),
    homeworkTotal: formatNumber(data.homeworks.length),
    homeworkRate: pct(summary.homeworkRate),
    examAverage: pct(summary.examAverage),
    examsCount: formatNumber(gradedExams.length),
    weakSkills: weak.length > 0 ? weak.join("، ") : DASH,
    strongSkills: strong.length > 0 ? strong.join("، ") : DASH,
    skillsCount: formatNumber(data.skills.length),
  };
}
