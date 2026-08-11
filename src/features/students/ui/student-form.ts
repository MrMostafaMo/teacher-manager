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
  };
}

export function studentFormErrors(t: (key: string) => string, error: ZodError): Record<string, string> {
  return mapZodErrors(error, (field, issue) =>
    field === "name"
      ? issue.code === "too_small"
        ? t("students.errors.nameRequired")
        : t("students.errors.nameTooLong")
      : t("students.errors.tooLong"),
  );
}
