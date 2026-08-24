import { ZodError } from "zod";
import dayjs from "dayjs";
import { mapZodErrors } from "@/lib/utils/zod-errors";
import type { Student } from "@/lib/db/schema";

export interface StudentFormState {
  name: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  status: "active" | "inactive";
  planId: string;
  groupId: string;
  notes: string;
  enrolledOn: string;
  birthDate: string;
  gradeLevel: string;
  photoUrl: string;
  isExempt: boolean;
  exemptReason: "" | "relative" | "scholarship" | "other";
  exemptNote: string;
}

export const emptyStudentForm: StudentFormState = {
  name: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  status: "active",
  planId: "",
  groupId: "",
  notes: "",
  enrolledOn: "",
  birthDate: "",
  gradeLevel: "",
  photoUrl: "",
  isExempt: false,
  exemptReason: "",
  exemptNote: "",
};

export function initialStudentForm(student: Student | null): StudentFormState {
  return {
    name: student?.name ?? "",
    phone: student?.phone ?? "",
    guardianName: student?.guardianName ?? "",
    guardianPhone: student?.guardianPhone ?? "",
    status: student?.status ?? "active",
    planId: student?.planId ?? "",
    groupId: "",
    notes: student?.notes ?? "",
    enrolledOn: student ? (student.enrolledOn ?? "") : dayjs().format("YYYY-MM-DD"),
    birthDate: student?.birthDate ?? "",
    gradeLevel: student?.gradeLevel ?? "",
    photoUrl: student?.photoUrl ?? "",
    isExempt: (student as unknown as { isExempt?: boolean })?.isExempt ?? false,
    exemptReason: ((student as unknown as { exemptReason?: string | null })?.exemptReason as StudentFormState["exemptReason"]) ?? "",
    exemptNote: (student as unknown as { exemptNote?: string | null })?.exemptNote ?? "",
  };
}

export function studentFormErrors(
  t: (key: string) => string,
  error: ZodError,
): Record<string, string> {
  return mapZodErrors(error, (field, issue) => {
    if (field === "name")
      return issue.code === "too_small" ? t("students.errors.nameRequired") : t("students.errors.nameTooLong");
    if (field === "enrolledOn") return t("students.errors.enrolledOnInvalid");
    if (field === "birthDate") return t("students.errors.birthDateInvalid");
    if (field === "phone" || field === "guardianPhone") return t("students.errors.phoneInvalid");
    return t("students.errors.tooLong");
  });
}
