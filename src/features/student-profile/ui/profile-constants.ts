import type { AttendanceStatus } from "@/features/attendance/domain";
import type { SubmissionStatus } from "@/features/homework/domain";

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "attendance.statusPresent",
  absent: "attendance.statusAbsent",
  late: "attendance.statusLate",
  excused: "attendance.statusExcused",
};

export const STATUS_BADGE: Record<AttendanceStatus, string> = {
  present: "bg-success/10 text-success",
  absent: "bg-destructive/10 text-destructive",
  late: "bg-warning/10 text-warning",
  excused: "bg-(--chart-5)/10 text-(--chart-5)",
};

export const SUBMISSION_BADGE: Record<SubmissionStatus, string> = {
  submitted: "bg-success/10 text-success",
  late: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
};

export const SUBMISSION_LABEL: Record<SubmissionStatus, string> = {
  submitted: "homework.statusSubmitted",
  late: "homework.statusLate",
  pending: "homework.statusPending",
};

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: "payments.cash",
  card: "payments.card",
  transfer: "payments.transfer",
};
