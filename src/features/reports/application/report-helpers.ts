import dayjs from "dayjs";
import { enrolledBy } from "@/lib/utils/enrollment";
import { studentRepository } from "@/features/students/infrastructure/student-repo";

export interface EnrolledStudent {
  id: string;
  name: string;
  planId: string | null;
  enrolledOn: string | null;
}

export function allEnrolledStudents(): Promise<EnrolledStudent[]> {
  return studentRepository.listEnrolled();
}

export function todayEnrolled(rows: EnrolledStudent[]): EnrolledStudent[] {
  const today = dayjs().format("YYYY-MM-DD");
  return rows.filter((s) => enrolledBy(s, today));
}
