import dayjs from "dayjs";

/**
 * Enrollment-date helpers. A student becomes visible on the first day of
 * their `enrolled_on` (inclusive) everywhere a roster is built — attendance,
 * session attendance, homework, exams, dues, and reports. NULL enrollment is
 * legacy and means no bound.
 */

/** True when the student is enrolled by `date` (NULL enrollment = no bound). */
export function enrolledBy(student: { enrolledOn: string | null }, date: string): boolean {
  return student.enrolledOn == null || student.enrolledOn <= date;
}

/**
 * Effective reference date of a dated item (homework/exam): its own date when
 * set, otherwise the day it was created.
 */
export function effectiveDate(date: string | null, createdAtMs: number): string {
  return date ?? dayjs(createdAtMs).format("YYYY-MM-DD");
}

/** Last day of a "YYYY-MM" period as a "YYYY-MM-DD" string. */
export function monthEnd(period: string): string {
  return dayjs(`${period}-01`).endOf("month").format("YYYY-MM-DD");
}
