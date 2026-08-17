import { db } from "@/lib/db/client";
import { students } from "@/lib/db/schema";
import dayjs from "dayjs";
import { enrolledBy } from "@/lib/utils/enrollment";

export interface EnrolledStudent {
  id: string;
  name: string;
  planId: string | null;
  enrolledOn: string | null;
}

export async function allEnrolledStudents(): Promise<EnrolledStudent[]> {
  return (await db
    .select({
      id: students.id,
      name: students.name,
      planId: students.planId,
      enrolledOn: students.enrolledOn,
    })
    .from(students)
    .orderBy(students.name)) as EnrolledStudent[];
}

export function todayEnrolled(rows: EnrolledStudent[]): EnrolledStudent[] {
  const today = dayjs().format("YYYY-MM-DD");
  return rows.filter((s) => enrolledBy(s, today));
}
