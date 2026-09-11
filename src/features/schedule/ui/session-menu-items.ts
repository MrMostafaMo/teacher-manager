export interface SessionMenuState {
  oneOff: boolean;
  moved: boolean;
  cancelled: boolean;
}

export type SessionMenuItem =
  "attend" | "occurrence" | "edit" | "delete" | "restore" | "restoreMoved";

/** Context-menu rows for a timetable block/card, mirroring its hover actions. */
export function sessionMenuItems(state: SessionMenuState): SessionMenuItem[] {
  if (state.cancelled) return ["restore"];
  if (state.oneOff)
    return state.moved ? ["attend", "restoreMoved", "delete"] : ["attend", "delete"];
  return ["attend", "occurrence", "edit", "delete"];
}

export interface SessionMenuCallbacks {
  onAttend: () => void;
  onOccurrence?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

/** Runs the callback for a picked menu row (restore rows open the occurrence dialog). */
export function routeSessionMenuItem(item: SessionMenuItem, cbs: SessionMenuCallbacks): void {
  if (item === "attend") cbs.onAttend();
  else if (item === "edit") cbs.onEdit?.();
  else if (item === "delete") cbs.onDelete();
  else cbs.onOccurrence?.();
}
