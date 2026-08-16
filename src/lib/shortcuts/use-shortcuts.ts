import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useShortcutsStore } from "./shortcuts-store";
import { useDialogStore } from "../dialog-store";
import { parseCombo, matchCombo } from "./combo";
import type { GlobalDialogId } from "../dialog-store";

const FOCUS_SELECTOR = "input,textarea,select,[contenteditable]";

function isInTextInput(el: Element | null): boolean {
  return el?.matches(FOCUS_SELECTOR) ?? false;
}

export function useShortcuts() {
  const shortcuts = useShortcutsStore((s) => s.shortcuts);
  const navigate = useNavigate();
  const openDialog = useDialogStore((s) => s.openDialog);

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      const inInput = isInTextInput(e.target as Element);
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;

      for (const [id, combo] of Object.entries(shortcuts)) {
        if (combo === "") continue;
        const parsedCombo = parseCombo(combo);
        if (!matchCombo(parsedCombo, e)) continue;
        if (inInput && !hasModifier) continue;
        e.preventDefault();
        executeAction(id, navigate, openDialog);
        return;
      }
    },
    [shortcuts, navigate, openDialog],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [handleKeydown]);
}

function executeAction(
  id: string,
  navigate: ReturnType<typeof useNavigate>,
  openDialog: (d: GlobalDialogId) => void,
) {
  if (id.startsWith("nav:")) {
    navigate(id.slice(4));
  } else if (id.startsWith("dialog:")) {
    openDialog(id.slice(7) as GlobalDialogId);
  } else if (id === "action:help") {
    window.dispatchEvent(new CustomEvent("shortcuts:toggle-help"));
  } else if (id === "action:mark-attendance") {
    navigate("/attendance");
  }
}
