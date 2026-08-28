import { errorKey, runRound } from "./sync-cases";
import { queryFirst } from "@/lib/db/client";
import type { SyncReport } from "./sync-report";
import { emptyReport } from "./sync-report";
import { SupabaseProvider } from "../infrastructure/supabase-provider";
import { pruneOldTombstones } from "../infrastructure/sync-state-repo";

async function schemaVersion(): Promise<number> {
  const row = await queryFirst<{ v: number | null }>("SELECT MAX(version) AS v FROM _sqlx_migrations", []);
  return row?.v ?? 0;
}

export async function syncAll(reason?: string): Promise<SyncReport> {
  void reason;
  const provider = new SupabaseProvider();
  if (!(await provider.isConfigured().catch(() => false))) return emptyReport(Date.now(), "sync.errors.notConnected");
  const version = await schemaVersion();
  try {
    const report = await runRound(provider, version);
    if (report.error === null) {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      void pruneOldTombstones(cutoff).catch(() => undefined);
    }
    return report;
  } catch (error) {
    console.error("[sync-orchestrator] failed", error);
    return emptyReport(Date.now(), errorKey(error));
  }
}

export async function anyProviderConfigured(): Promise<boolean> {
  return new SupabaseProvider().isConfigured().catch(() => false);
}
