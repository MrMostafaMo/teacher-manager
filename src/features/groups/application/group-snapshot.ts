import {
  examResults,
  exams,
  groupSessions,
  homeworks,
  homeworkSubmissions,
  sessionAttendance,
  sessionExceptions,
  studentGroups,
  studyGroups,
} from "@/lib/db/schema";
import { captureBy, captureIn, captureRows, restoreRows } from "@/lib/db/snapshot";

/**
 * Group delete snapshots: capture the rows a cascade clears so an undo can
 * re-insert them verbatim. Kept out of `group-cases.ts` so that file stays
 * within the line budget.
 */

export interface GroupSnapshot {
  group: Array<typeof studyGroups.$inferSelect>;
  members: Array<typeof studentGroups.$inferSelect>;
  sessions: Array<typeof groupSessions.$inferSelect>;
  attendance: Array<typeof sessionAttendance.$inferSelect>;
  exceptions: Array<typeof sessionExceptions.$inferSelect>;
  homeworks: Array<typeof homeworks.$inferSelect>;
  submissions: Array<typeof homeworkSubmissions.$inferSelect>;
  exams: Array<typeof exams.$inferSelect>;
  results: Array<typeof examResults.$inferSelect>;
}

export async function captureGroup(id: string): Promise<GroupSnapshot> {
  const sessionRows = await captureBy(groupSessions, groupSessions.groupId, id);
  const sessionIds = sessionRows.map((s) => s.id);
  const homeworkRows = await captureBy(homeworks, homeworks.groupId, id);
  const homeworkIds = homeworkRows.map((h) => h.id);
  const examRows = await captureBy(exams, exams.groupId, id);
  const examIds = examRows.map((e) => e.id);
  return {
    group: await captureRows(studyGroups, [id]),
    members: await captureBy(studentGroups, studentGroups.groupId, id),
    sessions: sessionRows,
    attendance: await captureIn(sessionAttendance, sessionAttendance.sessionId, sessionIds),
    exceptions: await captureIn(sessionExceptions, sessionExceptions.sessionId, sessionIds),
    homeworks: homeworkRows,
    submissions: await captureIn(homeworkSubmissions, homeworkSubmissions.homeworkId, homeworkIds),
    exams: examRows,
    results: await captureIn(examResults, examResults.examId, examIds),
  };
}

export async function restoreGroup(snapshot: GroupSnapshot): Promise<void> {
  await restoreRows(studyGroups, snapshot.group);
  await restoreRows(studentGroups, snapshot.members);
  await restoreRows(groupSessions, snapshot.sessions);
  await restoreRows(sessionAttendance, snapshot.attendance);
  await restoreRows(sessionExceptions, snapshot.exceptions);
  await restoreRows(homeworks, snapshot.homeworks);
  await restoreRows(homeworkSubmissions, snapshot.submissions);
  await restoreRows(exams, snapshot.exams);
  await restoreRows(examResults, snapshot.results);
}

export interface MemberSnapshot {
  membership: Array<typeof studentGroups.$inferSelect>;
  submissions: Array<typeof homeworkSubmissions.$inferSelect>;
  results: Array<typeof examResults.$inferSelect>;
  attendance: Array<typeof sessionAttendance.$inferSelect>;
}

/** Capture what removing a member prunes: the membership + their rows. */
export async function captureMember(studentId: string, groupId: string): Promise<MemberSnapshot> {
  const membership = (await captureBy(studentGroups, studentGroups.groupId, groupId)).filter(
    (r) => r.studentId === studentId,
  );
  const homeworkIds = (await captureBy(homeworks, homeworks.groupId, groupId)).map((h) => h.id);
  const submissions = (
    await captureIn(homeworkSubmissions, homeworkSubmissions.homeworkId, homeworkIds)
  ).filter((r) => r.studentId === studentId);
  const examIds = (await captureBy(exams, exams.groupId, groupId)).map((e) => e.id);
  const results = (await captureIn(examResults, examResults.examId, examIds)).filter(
    (r) => r.studentId === studentId,
  );
  const sessionIds = (await captureBy(groupSessions, groupSessions.groupId, groupId)).map(
    (s) => s.id,
  );
  const attendance = (
    await captureIn(sessionAttendance, sessionAttendance.sessionId, sessionIds)
  ).filter((r) => r.studentId === studentId);
  return { membership, submissions, results, attendance };
}

export async function restoreMember(snapshot: MemberSnapshot): Promise<void> {
  await restoreRows(studentGroups, snapshot.membership);
  await restoreRows(homeworkSubmissions, snapshot.submissions);
  await restoreRows(examResults, snapshot.results);
  await restoreRows(sessionAttendance, snapshot.attendance);
}
