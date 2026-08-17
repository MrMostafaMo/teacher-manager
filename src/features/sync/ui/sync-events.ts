import { useEffect } from "react";
import { DATA_CHANGED_EVENT } from "@/lib/undo-store";
import { isSyncBusy, syncNow } from "../application/sync-cases";
import type { SyncReport } from "../application/sync-report";
import { SYNC_META_KEYS, getSyncMeta } from "../infrastructure/sync-state-repo";
import { useSyncStore } from "./sync-store";

/**
 * App-glue for sync triggers: a debounced auto-push after any data change, a
 * pull on launch, and a periodic safety net. Mounted once in AppLayout.
 * Auto syncs are silent; only manual syncs surface toasts/reports.
 */

const AUTO_SYNC_DEBOUNCE_MS = 10_000;
const PERIODIC_INTERVAL_MS = 15 * 60_000;

let debounceTimer: number | null = null;

/** Remote rows were pulled in — remount pages so they re-fetch. */
function notifyAppliedChanges(report: SyncReport): void {
  const changed = Object.values(report.tables).some(
    (counts) => counts.applied > 0 || counts.deleted > 0,
  );
  if (changed) window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

async function runAutoSync(): Promise<void> {
  if (isSyncBusy()) return;
  const report = await syncNow("auto");
  const store = useSyncStore.getState();
  store.setLastReport(report);
  if (report.error === null) {
    store.setLastSyncAt(report.at);
    notifyAppliedChanges(report);
  }
}

function scheduleAutoSync(): void {
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void runAutoSync();
  }, AUTO_SYNC_DEBOUNCE_MS);
}

/** Manual "Sync now": runs immediately, surfaces the report in the UI and
 * returns it so callers can toast the outcome. */
export async function runManualSync(): Promise<SyncReport> {
  const store = useSyncStore.getState();
  store.setBusy(true);
  try {
    const report = await syncNow("manual");
    store.setLastReport(report);
    store.setError(report.error);
    if (report.error === null) {
      store.setLastSyncAt(report.at);
      notifyAppliedChanges(report);
    }
    return report;
  } finally {
    store.setBusy(false);
  }
}

export function SyncManager(): null {
  useEffect(() => {
    window.addEventListener(DATA_CHANGED_EVENT, scheduleAutoSync);
    const periodic = window.setInterval(() => void runAutoSync(), PERIODIC_INTERVAL_MS);
    void runAutoSync();
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, scheduleAutoSync);
      window.clearInterval(periodic);
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
    };
  }, []);
  return null;
}

/** Reflect sync_meta (client id, email, last sync) into the store. */
export async function refreshSyncUi(): Promise<void> {
  const [clientId, email, lastSyncAt] = await Promise.all([
    getSyncMeta(SYNC_META_KEYS.clientId),
    getSyncMeta(SYNC_META_KEYS.accountEmail),
    getSyncMeta(SYNC_META_KEYS.lastSyncAt),
  ]);
  const store = useSyncStore.getState();
  store.setClientId(clientId);
  store.setAccount(email);
  store.setLastSyncAt(lastSyncAt === null ? null : Number(lastSyncAt));
}
