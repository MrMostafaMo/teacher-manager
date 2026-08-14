import { weakPointInputSchema, type WeakPointInput } from "@/features/weak-points/domain";
import { weakPointRepository } from "@/features/weak-points/infrastructure/weak-point-repo";
import { logActivity } from "@/lib/activity-log";
import { weakPoints, type WeakPoint } from "@/lib/db/schema";
import { captureRows, restoreRows } from "@/lib/db/snapshot";
import { registerUndo } from "@/lib/undo-store";
import { uuid } from "@/lib/utils/uuid";

/** Weak-point row with the DB 0/1 flag normalized to a boolean. */
export interface StudentWeakPoint extends Omit<WeakPoint, "resolved"> {
  resolved: boolean;
}

function toView(row: WeakPoint): StudentWeakPoint {
  return { ...row, resolved: row.resolved === 1 };
}

export async function listStudentWeakPoints(studentId: string): Promise<StudentWeakPoint[]> {
  const rows = await weakPointRepository.byStudent(studentId);
  return rows.map(toView);
}

export async function listAllWeakPoints(): Promise<StudentWeakPoint[]> {
  const rows = await weakPointRepository.all();
  return rows.map(toView);
}

export async function addWeakPoint(
  studentId: string,
  input: WeakPointInput,
): Promise<StudentWeakPoint> {
  const parsed = weakPointInputSchema.parse(input);
  const row = await weakPointRepository.insert({
    id: uuid(),
    studentId,
    description: parsed.description,
    recordedOn: parsed.recordedOn,
    resolved: parsed.resolved ? 1 : 0,
  });
  await logActivity({
    action: "weakPoint.create",
    entityType: "weakPoint",
    entityId: row.id,
    details: { studentId, description: row.description },
  });
  return toView(row);
}

export async function updateWeakPoint(
  id: string,
  input: WeakPointInput,
): Promise<StudentWeakPoint> {
  const parsed = weakPointInputSchema.parse(input);
  const row = await weakPointRepository.update(id, {
    description: parsed.description,
    recordedOn: parsed.recordedOn,
    resolved: parsed.resolved ? 1 : 0,
  });
  if (!row) throw new Error(`weak point ${id} not found`);
  await logActivity({
    action: "weakPoint.update",
    entityType: "weakPoint",
    entityId: id,
    details: { studentId: row.studentId, description: row.description },
  });
  return toView(row);
}

export async function removeWeakPoint(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const rows = options.undo === false ? [] : await captureRows(weakPoints, [id]);
  const removed = await weakPointRepository.remove(id);
  if (!removed) throw new Error(`weak point ${id} not found`);
  await logActivity({ action: "weakPoint.delete", entityType: "weakPoint", entityId: id });
  if (options.undo === false) return null;
  return registerUndo(() => restoreRows(weakPoints, rows));
}
