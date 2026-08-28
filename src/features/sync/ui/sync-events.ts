import { useEffect } from "react";
import { DATA_CHANGED_EVENT } from "@/lib/undo-store";
import { isSyncBusy } from "../application/sync-cases";
import { anyProviderConfigured, syncAll } from "../application/sync-orchestrator";
import type { SyncReport } from "../application/sync-report";
import { SYNC_META_KEYS, getSyncMeta } from "../infrastructure/sync-state-repo";
import { useSyncStore } from "./sync-store";

const AUTO_SYNC_DEBOUNCE_MS = 10_000;
const PERIODIC_INTERVAL_MS = 15 * 60_000;

let debounceTimer: number | null = null;

function notifyAppliedChanges(report: SyncReport): void {
  const changed = Object.values(report.tables).some((c) => c.applied > 0 || c.deleted > 0);
  if (changed) window.dispatchEvent(new Event(DATA_CHANGED_EVENT));
}

async function runAutoSync(): Promise<void> {
  if (isSyncBusy() || useSyncStore.getState().busy) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (!(await anyProviderConfigured())) return;
  const store = useSyncStore.getState();
  store.setBusy(true);
  try {
    const report = await syncAll("auto");
    store.setLastReport(report);
    if (report.error === null) {
      store.setLastSyncAt(report.at);
      notifyAppliedChanges(report);
    } else {
      store.setError(report.error);
    }
  } finally {
    store.setBusy(false);
  }
}

function scheduleAutoSync(): void {
  if (debounceTimer !== null) window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null;
    void runAutoSync();
  }, AUTO_SYNC_DEBOUNCE_MS);
}

export async function runManualSync(): Promise<SyncReport> {
  const store = useSyncStore.getState();
  store.setBusy(true);
  try {
    const report = await syncAll("manual");
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
    void refreshSyncUi();
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

export async function refreshSyncUi(): Promise<void> {
  try {
    const [supabaseEmail, lastSyncAt] = await Promise.all([
      getSyncMeta(SYNC_META_KEYS.supabaseEmail),
      getSyncMeta(SYNC_META_KEYS.lastSyncAt),
    ]);
    const store = useSyncStore.getState();
    store.setSupabaseAccount(supabaseEmail);
    store.setLastSyncAt(lastSyncAt === null ? null : Number(lastSyncAt));
  } catch (error) {
    console.error("[sync] refreshSyncUi failed", error);
  }
}
