import { groupSessionInputSchema, type GroupSessionInput } from "@/features/schedule/domain";
import {
  scheduleRepository,
  type SessionWithGroup,
} from "@/features/schedule/infrastructure/schedule-repo";
import { logActivity } from "@/lib/activity-log";
import type { GroupSession } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";

/**
 * Weekly-timetable use-cases. Validate input, write through the repository,
 * and record each mutation in the activity log.
 */

export function listSchedule(): Promise<SessionWithGroup[]> {
  return scheduleRepository.listAll();
}

export async function createSession(input: GroupSessionInput): Promise<GroupSession> {
  const parsed = groupSessionInputSchema.parse(input);
  const row = await scheduleRepository.insert({ id: uuid(), ...parsed });
  await logActivity({
    action: "schedule.create",
    entityType: "schedule",
    entityId: row.id,
    details: { groupId: row.groupId, dayOfWeek: row.dayOfWeek, startTime: row.startTime },
  });
  return row;
}

export async function updateSession(id: string, input: GroupSessionInput): Promise<GroupSession> {
  const parsed = groupSessionInputSchema.parse(input);
  const row = await scheduleRepository.update(id, parsed);
  if (!row) throw new Error(`session ${id} not found`);
  await logActivity({
    action: "schedule.update",
    entityType: "schedule",
    entityId: row.id,
    details: { groupId: row.groupId, dayOfWeek: row.dayOfWeek, startTime: row.startTime },
  });
  return row;
}

export async function deleteSession(id: string): Promise<void> {
  const removed = await scheduleRepository.remove(id);
  if (!removed) throw new Error(`session ${id} not found`);
  await logActivity({ action: "schedule.delete", entityType: "schedule", entityId: id });
}
