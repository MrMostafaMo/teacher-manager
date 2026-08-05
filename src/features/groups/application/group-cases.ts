import { studyGroupInputSchema, type StudyGroupInput } from "@/features/groups/domain";
import {
  groupRepository,
  type GroupWithCount,
} from "@/features/groups/infrastructure/group-repo";
import { homeworkRepository } from "@/features/homework/infrastructure/homework-repo";
import { examRepository } from "@/features/exams/infrastructure/exam-repo";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { logActivity } from "@/lib/activity-log";
import type { Student, StudyGroup } from "@/lib/db/schema";
import { uuid } from "@/lib/utils/uuid";

/**
 * Study-groups use-cases. Validate input, write through the repository, and
 * record each mutation in the activity log.
 */

export function listGroups(): Promise<GroupWithCount[]> {
  return groupRepository.list();
}

export function listMemberships(): Promise<
  Array<{ studentId: string; groupId: string; groupName: string }>
> {
  return groupRepository.memberships();
}

export interface GroupDetail {
  group: StudyGroup;
  members: Student[];
  /** Active students not yet in the group, offered by the add-member picker. */
  available: Student[];
}

export async function getGroupDetail(groupId: string): Promise<GroupDetail> {
  const [group, members, available] = await Promise.all([
    groupRepository.findById(groupId),
    groupRepository.members(groupId),
    groupRepository.nonMembers(groupId),
  ]);
  if (!group) throw new Error(`group ${groupId} not found`);
  return { group, members, available };
}

export async function createGroup(input: StudyGroupInput): Promise<StudyGroup> {
  const parsed = studyGroupInputSchema.parse(input);
  const row = await groupRepository.insert({ id: uuid(), ...parsed });
  await logActivity({
    action: "group.create",
    entityType: "group",
    entityId: row.id,
    details: { name: row.name },
  });
  return row;
}

export async function updateGroup(id: string, input: StudyGroupInput): Promise<StudyGroup> {
  const parsed = studyGroupInputSchema.parse(input);
  const row = await groupRepository.update(id, parsed);
  if (!row) throw new Error(`group ${id} not found`);
  await logActivity({
    action: "group.update",
    entityType: "group",
    entityId: row.id,
    details: { name: row.name },
  });
  return row;
}

export async function deleteGroup(id: string): Promise<void> {
  await groupRepository.clearMembers(id);
  // FKs are off — clear this group's homework + submissions or they orphan.
  await homeworkRepository.clearForGroup(id);
  await examRepository.clearForGroup(id);
  await scheduleRepository.clearForGroup(id);
  const removed = await groupRepository.remove(id);
  if (!removed) throw new Error(`group ${id} not found`);
  await logActivity({ action: "group.delete", entityType: "group", entityId: id });
}

export async function addStudentToGroup(studentId: string, groupId: string): Promise<void> {
  await groupRepository.addMember(studentId, groupId);
  await logActivity({
    action: "group.member.add",
    entityType: "group",
    entityId: groupId,
    details: { studentId },
  });
}

export async function removeStudentFromGroup(studentId: string, groupId: string): Promise<void> {
  const removed = await groupRepository.removeMember(studentId, groupId);
  if (!removed) throw new Error(`membership ${studentId}/${groupId} not found`);
  await logActivity({
    action: "group.member.remove",
    entityType: "group",
    entityId: groupId,
    details: { studentId },
  });
}
