import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/shared/Modal";
import { useShortcutsStore } from "@/lib/shortcuts/shortcuts-store";
import { DEFAULT_SHORTCUTS } from "@/lib/shortcuts/defaults";
import { parseCombo, formatCombo } from "@/lib/shortcuts/combo";
import type { ShortcutActionId } from "@/lib/shortcuts/types";

const GROUP_ORDER = ["navigation", "create", "actions"] as const;

const LABEL_KEYS: Record<ShortcutActionId, string> = {
  "nav:/": "nav.dashboard",
  "nav:/students": "nav.students",
  "nav:/attendance": "nav.attendance",
  "nav:/groups": "nav.groups",
  "nav:/payments": "nav.payments",
  "nav:/expenses": "nav.expenses",
  "nav:/homework": "nav.homework",
  "nav:/exams": "nav.exams",
  "nav:/skills": "nav.skills",
  "nav:/weak-points": "nav.weakPoints",
  "nav:/schedule": "nav.schedule",
  "nav:/reports": "nav.reports",
  "nav:/activity": "nav.activity",
  "nav:/settings": "nav.settings",
  "dialog:student": "students.add",
  "dialog:payment": "payments.record",
  "dialog:expense": "expenses.record",
  "dialog:group": "groups.add",
  "dialog:schedule": "schedule.add",
  "dialog:homework": "homework.add",
  "dialog:exam": "exams.add",
  "dialog:skill": "skills.add",
  "action:help": "shortcuts.title",
  "action:mark-attendance": "dashboard.quick.attendance",
};

export function ShortcutsOverlay() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  const shortcuts = useShortcutsStore((s) => s.shortcuts);
  const isMac =
    typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

  useEffect(() => {
    const onToggle = () => setOpen((o) => !o);
    window.addEventListener("shortcuts:toggle-help", onToggle);
    return () => window.removeEventListener("shortcuts:toggle-help", onToggle);
  }, []);

  const grouped = useMemo(() => {
    const map: Record<string, { label: string; combo: string }[]> = {};
    for (const def of DEFAULT_SHORTCUTS) {
      if (!map[def.group]) map[def.group] = [];
      map[def.group].push({
        label: t(LABEL_KEYS[def.id] ?? def.id),
        combo: formatCombo(parseCombo(shortcuts[def.id] ?? def.defaultCombo), isMac),
      });
    }
    return map;
  }, [shortcuts, t, isMac]);

  if (!open) return null;

  return (
      <Modal open={open} onClose={() => setOpen(false)} title={t("shortcuts.title")}>
        <div className="space-y-4 p-5">
        {GROUP_ORDER.map((group) => (
          <section key={group}>
            <h3 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              {t(`shortcuts.${group}`)}
            </h3>
            <div className="space-y-1">
              {(grouped[group] ?? []).map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{item.label}</span>
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    {item.combo}
                  </kbd>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
