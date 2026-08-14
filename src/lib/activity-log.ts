import { createRepository } from "@/lib/db/repository";
import { activityLogs } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";

/**
 * Audit trail for every mutation. Feature use-cases call `logActivity` after
 * each successful write; the activity log powers the dashboard's recent
 * activity and the audit view.
 */

const repository = createRepository(activityLogs);

export interface LogActivityInput {
  /** Namespaced action, e.g. "student.create", "payment.create". */
  action: string;
  /** Entity kind, e.g. "student", "payment". */
  entityType: string;
  entityId?: string;
  /** Optional structured refs/context, serialized to JSON. */
  details?: Record<string, unknown>;
}

export type ActivityLogRow = NonNullable<Awaited<ReturnType<typeof repository.findById>>>;

/** Maps stored action strings to i18n keys under `activity.actions.*`. */
export const ACTION_KEYS: Record<string, string> = {
  "app.launch": "appLaunch",
  "student.create": "studentCreate",
  "student.update": "studentUpdate",
  "student.delete": "studentDelete",
  "payment.create": "paymentCreate",
  "payment.update": "paymentUpdate",
  "payment.delete": "paymentDelete",
  "plan.create": "planCreate",
  "plan.update": "planUpdate",
  "plan.delete": "planDelete",
  "expense.create": "expenseCreate",
  "expense.update": "expenseUpdate",
  "expense.delete": "expenseDelete",
  "skill.create": "skillCreate",
  "skill.update": "skillUpdate",
  "skill.delete": "skillDelete",
  "skill.level": "skillLevel",
  "homework.create": "homeworkCreate",
  "homework.update": "homeworkUpdate",
  "homework.delete": "homeworkDelete",
  "homework.submit": "homeworkSubmit",
  "homework.submitAll": "homeworkSubmitAll",
  "debug.check": "debugCheck",
  "sessions.date": "sessionsDate",
  "schedule.create": "scheduleCreate",
  "schedule.update": "scheduleUpdate",
  "schedule.delete": "scheduleDelete",
  "schedule.attendance.save": "scheduleAttendanceSave",
  "schedule.exceptionCancel": "scheduleExceptionCancel",
  "schedule.exceptionMove": "scheduleExceptionMove",
  "schedule.exceptionRestore": "scheduleExceptionRestore",
  "group.create": "groupCreate",
  "group.update": "groupUpdate",
  "group.delete": "groupDelete",
  "group.member.add": "groupMemberAdd",
  "group.member.remove": "groupMemberRemove",
  "exam.create": "examCreate",
  "exam.update": "examUpdate",
  "exam.delete": "examDelete",
  "exam.result": "examResult",
  "attendance.save": "attendanceSave",
  "weakPoint.create": "weakPointCreate",
  "weakPoint.update": "weakPointUpdate",
  "weakPoint.delete": "weakPointDelete",
};

/** Writes one activity log entry. Never throws on its own failure. */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await repository.insert({
      id: uuid(),
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      details: input.details ? JSON.stringify(input.details) : null,
    });
  } catch (error) {
    console.error("logActivity failed", error);
  }
}

/** Newest-first activity feed, most recent first. */
export async function listRecentActivity(limit = 50): Promise<ActivityLogRow[]> {
  const rows = await repository.list({ limit, newestFirst: true });
  return rows as ActivityLogRow[];
}
