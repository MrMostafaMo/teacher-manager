import { asc, count } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { plans, students, type Plan } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";

/**
 * Subscription plans repository: generic CRUD plus a list with the number of
 * students currently subscribed to each plan.
 */
export interface PlanWithCount extends Plan {
  memberCount: number;
}

export const planRepository = {
  ...createRepository(plans),

  async list(): Promise<PlanWithCount[]> {
    const rows = (await db.select().from(plans).orderBy(asc(plans.amount))) as Plan[];
    const counts = (await db
      .select({ planId: students.planId, n: count() })
      .from(students)
      .groupBy(students.planId)) as Array<{ planId: string | null; n: number }>;
    const byId = new Map(counts.map((c) => [c.planId ?? "", c.n]));
    return rows.map((p) => ({ ...p, memberCount: byId.get(p.id) ?? 0 }));
  },
};
