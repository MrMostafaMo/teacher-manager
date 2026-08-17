export type ShortcutActionId = `nav:${string}` | `dialog:${string}` | `action:${string}`;

export interface ShortcutDefinition {
  id: ShortcutActionId;
  defaultCombo: string;
  group: "navigation" | "create" | "actions";
}

export interface ParsedCombo {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}
