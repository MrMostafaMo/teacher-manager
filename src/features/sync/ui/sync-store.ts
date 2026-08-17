import { create } from "zustand";
import type { SyncReport } from "@/features/sync/application/sync-report";

/**
 * UI state for the sync feature: connection info, running flag and the last
 * report (manual + auto shares this). Persisted facts (email, last sync time)
 * live in sync_meta and are read via the repo on connect/refresh.
 */

export interface SyncUiState {
  busy: boolean;
  clientId: string | null;
  accountEmail: string | null;
  lastSyncAt: number | null;
  lastReport: SyncReport | null;
  error: string | null;
}

interface SyncStore extends SyncUiState {
  setBusy: (busy: boolean) => void;
  setClientId: (clientId: string | null) => void;
  setAccount: (email: string | null) => void;
  setLastSyncAt: (at: number | null) => void;
  setLastReport: (report: SyncReport | null) => void;
  setError: (error: string | null) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  busy: false,
  clientId: null,
  accountEmail: null,
  lastSyncAt: null,
  lastReport: null,
  error: null,
  setBusy: (busy) => set({ busy }),
  setClientId: (clientId) => set({ clientId }),
  setAccount: (accountEmail) => set({ accountEmail }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setLastReport: (lastReport) => set({ lastReport }),
  setError: (error) => set({ error }),
}));
