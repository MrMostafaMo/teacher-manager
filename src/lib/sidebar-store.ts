import { shimStore } from "@/lib/settings/settings-store";

export interface SidebarState {
  isPinned: boolean;
  togglePinned: () => void;
}

/** Compatibility shim over the unified settings store (one release). */
export const useSidebarStore = shimStore<SidebarState>((s) => ({
  isPinned: s.isPinned,
  togglePinned: s.togglePinned,
}));
