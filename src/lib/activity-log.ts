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

export type ActivityLogRow = Awaited<ReturnType<typeof repository.findById>>;

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
