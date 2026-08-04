import { planInputSchema, type PlanInput } from "@/features/payments/domain";
import {
  planRepository,
  type PlanWithCount,
} from "@/features/payments/infrastructure/plan-repo";
import { studentRepository } from "@/features/students/infrastructure/student-repo";
import { logActivity } from "@/lib/activity-log";
import type { Plan } from "@/lib/db/schema";
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
  const row = await planRepository.update(id, parsed);
  if (!row) throw new Error(`plan ${id} not found`);
  await logActivity({
    action: "plan.update",
    entityType: "plan",
    entityId: row.id,
    details: { name: row.name },
  });
  return row;
}

export async function deletePlan(id: string): Promise<void> {
  await studentRepository.clearPlan(id);
  const removed = await planRepository.remove(id);
  if (!removed) throw new Error(`plan ${id} not found`);
  await logActivity({ action: "plan.delete", entityType: "plan", entityId: id });
}
