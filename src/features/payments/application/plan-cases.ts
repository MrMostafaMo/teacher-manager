import { planInputSchema, type PlanInput } from "@/features/payments/domain";
import { planRepository, type PlanWithCount } from "@/features/payments/infrastructure/plan-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { logActivity } from "@/lib/activity-log";
import { db } from "@/lib/db/client";
import { plans, planPriceHistory, students, type Plan } from "@/lib/db/schema";
import { captureBy, captureRows, restoreRows } from "@/lib/db/snapshot";
import { registerUndo } from "@/lib/undo-store";
import { uuid } from "@/lib/utils/uuid";

/**
 * Subscription-plan use-cases. Validate input, write through the repository,
 * and record each mutation in the activity log.
 */

export function listPlans(): Promise<PlanWithCount[]> {
  return planRepository.list();
}

export async function createPlan(input: PlanInput): Promise<Plan> {
  const parsed = planInputSchema.parse(input);
  const row = await planRepository.insert({ id: uuid(), ...parsed });

  await db
    .insert(planPriceHistory)
    .values({
      id: uuid(),
      planId: row.id,
      amount: row.amount,
      effectiveFrom: new Date(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    .run();

  await logActivity({
    action: "plan.create",
    entityType: "plan",
    entityId: row.id,
    details: { name: row.name },
  });
  return row;
}

export async function updatePlan(id: string, input: PlanInput): Promise<Plan> {
  const parsed = planInputSchema.parse(input);
  
  // Fetch current to see if amount changed
  const current = await planRepository.findById(id);
  const row = await planRepository.update(id, parsed);
  if (!row) throw new Error(`plan ${id} not found`);

  if (current && current.amount !== row.amount) {
    await db
      .insert(planPriceHistory)
      .values({
        id: uuid(),
        planId: row.id,
        amount: row.amount,
        effectiveFrom: new Date(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .run();
  }

  await logActivity({
    action: "plan.update",
    entityType: "plan",
    entityId: row.id,
    details: { name: row.name },
  });
  return row;
}

export async function deletePlan(
  id: string,
  options: { undo?: boolean } = {},
): Promise<number | null> {
  const undoEnabled = options.undo !== false;
  const planRows = undoEnabled ? await captureRows(plans, [id]) : [];
  const studentRows = undoEnabled ? await captureBy(students, students.planId, id) : [];
  await studentRepository.clearPlan(id);
  const removed = await planRepository.remove(id);
  if (!removed) throw new Error(`plan ${id} not found`);
  await logActivity({ action: "plan.delete", entityType: "plan", entityId: id });
  if (!undoEnabled) return null;
  const studentIds = studentRows.map((s) => s.id);
  return registerUndo(async () => {
    await restoreRows(plans, planRows);
    await studentRepository.restorePlan(id, studentIds);
  });
}
