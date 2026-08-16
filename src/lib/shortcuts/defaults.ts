import type { ShortcutDefinition } from "./types";

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  { id: "nav:/", defaultCombo: "ctrl+d", group: "navigation" },
  { id: "nav:/students", defaultCombo: "ctrl+shift+s", group: "navigation" },
  { id: "nav:/attendance", defaultCombo: "ctrl+a", group: "navigation" },
  { id: "nav:/groups", defaultCombo: "ctrl+g", group: "navigation" },
  { id: "nav:/payments", defaultCombo: "ctrl+shift+p", group: "navigation" },
  { id: "nav:/expenses", defaultCombo: "ctrl+e", group: "navigation" },
  { id: "nav:/homework", defaultCombo: "ctrl+h", group: "navigation" },
  { id: "nav:/exams", defaultCombo: "ctrl+t", group: "navigation" },
  { id: "nav:/skills", defaultCombo: "ctrl+y", group: "navigation" },
  { id: "nav:/weak-points", defaultCombo: "ctrl+shift+w", group: "navigation" },
  { id: "nav:/schedule", defaultCombo: "ctrl+l", group: "navigation" },
  { id: "nav:/reports", defaultCombo: "ctrl+r", group: "navigation" },
  { id: "nav:/activity", defaultCombo: "ctrl+shift+o", group: "navigation" },
  { id: "nav:/settings", defaultCombo: "ctrl+,", group: "navigation" },
  { id: "dialog:student", defaultCombo: "ctrl+n", group: "create" },
  { id: "dialog:payment", defaultCombo: "ctrl+shift+m", group: "create" },
  { id: "dialog:expense", defaultCombo: "ctrl+shift+e", group: "create" },
  { id: "dialog:group", defaultCombo: "ctrl+shift+g", group: "create" },
  { id: "dialog:schedule", defaultCombo: "ctrl+shift+s", group: "create" },
  { id: "dialog:homework", defaultCombo: "ctrl+shift+h", group: "create" },
  { id: "dialog:exam", defaultCombo: "ctrl+shift+t", group: "create" },
  { id: "dialog:skill", defaultCombo: "ctrl+shift+k", group: "create" },
  { id: "action:help", defaultCombo: "ctrl+/", group: "actions" },
  { id: "action:mark-attendance", defaultCombo: "ctrl+m", group: "actions" },
];

export const SHORTCUT_IDS = DEFAULT_SHORTCUTS.map((s) => s.id);
