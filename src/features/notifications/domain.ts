export type NotificationType =
  | "homework_overdue"
  | "payment_overdue"
  | "exception"
  | "weak_skill"
  | "low_attendance"
  | "exam_upcoming"
  | "student_birthday";

export interface NotificationItem {
  type: NotificationType;
  key: string;
  details: {
    title?: string;
    dueDate?: string | null;
    pending?: number;
    groupName?: string | null;
    name?: string;
    remaining?: number;
    period?: string;
    sessionId?: string;
    date?: string;
    kind?: "cancelled" | "moved";
    count?: number;
    rate?: number;
    absent?: number;
    examDate?: string;
    gradeLevel?: string | null;
  };
}
