import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { planPriceHistory, plans, students, type Plan, type PlanPriceHistory } from "@/lib/db/schema";
import { createRepository } from "@/lib/db/repository";
import { uuid } from "@/lib/utils/uuid";

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

  /** Price history for a plan, oldest first (tolerates pre-v21 DBs). */
  async historyForPlan(planId: string): Promise<PlanPriceHistory[]> {
    try {
      const rows = await db
        .select()
        .from(planPriceHistory)
        .where(eq(planPriceHistory.planId, planId))
        .orderBy(asc(planPriceHistory.effectiveFrom));
      return rows as PlanPriceHistory[];
    } catch {
      return [];
    }
  },

  /** Record a price point; never throws (pre-v21 DBs lack the table). */
  async recordPrice(planId: string, amount: number, context: "create" | "update"): Promise<void> {
    try {
      const ts = Date.now();
      await db
        .insert(planPriceHistory)
        .values({ id: uuid(), planId, amount, effectiveFrom: new Date(), createdAt: ts, updatedAt: ts })
        .run();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("no such table")) {
        console.warn(`[plan] price history table missing on ${context} — skipping (needs migration v21)`, error);
      } else {
        console.warn(`[plan] price history insert failed on ${context}`, error);
      }
    }
  },
};
