import { create } from "zustand";
import type { SyncReport } from "@/features/sync/application/sync-report";

export interface SyncUiState {
  busy: boolean;
  supabaseEmail: string | null;
  lastSyncAt: number | null;
  lastReport: SyncReport | null;
  error: string | null;
}

interface SyncStore extends SyncUiState {
  setBusy: (busy: boolean) => void;
  setSupabaseAccount: (email: string | null) => void;
  setLastSyncAt: (at: number | null) => void;
  setLastReport: (report: SyncReport | null) => void;
  setError: (error: string | null) => void;
}

export const useSyncStore = create<SyncStore>((set) => ({
  busy: false,
  supabaseEmail: null,
  lastSyncAt: null,
  lastReport: null,
  error: null,
  setBusy: (busy) => set({ busy }),
  setSupabaseAccount: (supabaseEmail) => set({ supabaseEmail }),
  setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
  setLastReport: (lastReport) => set({ lastReport }),
  setError: (error) => set({ error }),
}));
