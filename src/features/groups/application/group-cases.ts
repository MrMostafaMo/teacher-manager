import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  studyGroups,
  studentGroups,
  attendance,
  homeworks,
  homeworkSubmissions,
  exams,
  examResults,
  groupSessions,
  sessionExceptions,
  type Student,
  type StudyGroup,
} from "@/lib/db/schema";
import { studyGroupInputSchema, type StudyGroupInput } from "@/features/groups/domain";
import { groupRepository, type GroupWithCount } from "@/features/groups/infrastructure/group-repo";
import { homeworkRepository } from "@/features/homework/infrastructure/homework-repo";
import { examRepository } from "@/features/exams/infrastructure/exam-repo";
import { scheduleRepository } from "@/features/schedule/infrastructure/schedule-repo";
import { logActivity } from "@/lib/activity-log";
import { registerUndo } from "@/lib/undo-store";
import { uuid } from "@/lib/utils/uuid";
import { captureGroup, captureMember, restoreGroup, restoreMember } from "./group-snapshot";

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
    groupRepository.nonMembers(),
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

export async function deleteGroup(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const snapshot = options.undo === false ? null : await captureGroup(id);

  const hwIds = db.select({ id: homeworks.id }).from(homeworks).where(eq(homeworks.groupId, id));
  const exIds = db.select({ id: exams.id }).from(exams).where(eq(exams.groupId, id));
  const sessIds = db.select({ id: groupSessions.id }).from(groupSessions).where(eq(groupSessions.groupId, id));

  await db.batch([
    db.delete(studentGroups).where(eq(studentGroups.groupId, id)),
    db.delete(attendance).where(eq(attendance.groupId, id)),
    db.delete(homeworkSubmissions).where(inArray(homeworkSubmissions.homeworkId, hwIds)),
    db.delete(homeworks).where(eq(homeworks.groupId, id)),
    db.delete(examResults).where(inArray(examResults.examId, exIds)),
    db.delete(exams).where(eq(exams.groupId, id)),
    db.delete(sessionExceptions).where(inArray(sessionExceptions.sessionId, sessIds)),
    db.delete(groupSessions).where(eq(groupSessions.groupId, id)),
    db.delete(studyGroups).where(eq(studyGroups.id, id)),
  ]);

  await logActivity({ action: "group.delete", entityType: "group", entityId: id });
  if (!snapshot) return null;
  return registerUndo(() => restoreGroup(snapshot));
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

export async function removeStudentFromGroup(
  studentId: string,
  groupId: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const snapshot = options.undo === false ? null : await captureMember(studentId, groupId);
  const removed = await groupRepository.removeMember(studentId, groupId);
  if (!removed) throw new Error(`membership ${studentId}/${groupId} not found`);
  // FKs are off — the student's homework submissions + exam results for this
  // group's items would otherwise orphan (and skew its stats).
  await homeworkRepository.clearForStudentInGroup(studentId, groupId);
  await examRepository.clearForStudentInGroup(studentId, groupId);
  await scheduleRepository.clearAttendanceForStudentInGroup(studentId, groupId);
  await logActivity({
    action: "group.member.remove",
    entityType: "group",
    entityId: groupId,
    details: { studentId },
  });
  if (!snapshot) return null;
  return registerUndo(() => restoreMember(snapshot));
}

/** One class per student: replace every membership with a single one (or none). */
export async function setStudentGroup(studentId: string, groupId: string | null): Promise<void> {
  await groupRepository.clearForStudent(studentId);
  if (!groupId) return;
  await groupRepository.addMember(studentId, groupId);
  await logActivity({
    action: "group.member.add",
    entityType: "group",
    entityId: groupId,
    details: { studentId },
  });
}
