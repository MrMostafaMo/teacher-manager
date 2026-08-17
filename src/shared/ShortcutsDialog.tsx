import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/shared/Modal";
import { ShortcutInput } from "@/shared/ShortcutInput";
import { DEFAULT_SHORTCUTS } from "@/lib/shortcuts/defaults";
import { useShortcutsStore } from "@/lib/shortcuts/shortcuts-store";
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

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const shortcuts = useShortcutsStore((s) => s.shortcuts);
  const setShortcut = useShortcutsStore((s) => s.setShortcut);
  const resetShortcut = useShortcutsStore((s) => s.resetShortcut);
  const resetShortcuts = useShortcutsStore((s) => s.resetShortcuts);
  const findDuplicate = useShortcutsStore((s) => s.findDuplicate);
  const [dups, setDups] = useState<Record<string, string>>({});

  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

  const grouped = useMemo(() => {
    const map: Record<string, typeof DEFAULT_SHORTCUTS> = {};
    for (const def of DEFAULT_SHORTCUTS) {
      if (!map[def.group]) map[def.group] = [];
      map[def.group].push(def);
    }
    return map;
  }, []);

  function handleChange(id: ShortcutActionId, combo: string) {
    const dup = findDuplicate(id, combo);
    if (dup) {
      setDups((d) => ({ ...d, [id]: t("shortcuts.duplicate") }));
      return;
    }
    setDups((d) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring to exclude `id`
      const { [id]: _removed, ...rest } = d;
      return rest;
    });
    setShortcut(id, combo);
  }

  return (
    <Modal open={open} title={t("shortcuts.manage")} onClose={onClose} className="max-w-2xl">
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetShortcuts}
            className="h-7 gap-1 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3" />
            {t("shortcuts.restoreAll")}
          </Button>
        </div>
        {GROUP_ORDER.map((group) => (
          <div key={group}>
            <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(`shortcuts.${group}`)}
            </h4>
            <div className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
              {(grouped[group] ?? []).map((def) => (
                <div key={def.id} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="truncate text-xs text-muted-foreground">
                    {t(LABEL_KEYS[def.id] ?? def.id)}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <ShortcutInput
                      value={shortcuts[def.id] ?? def.defaultCombo}
                      onChange={(c) => handleChange(def.id, c)}
                      isMac={isMac}
                      error={dups[def.id]}
                    />
                    {(shortcuts[def.id] ?? "") !== def.defaultCombo && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => resetShortcut(def.id)}
                        aria-label={t("shortcuts.restoreDefaults")}
                      >
                        <RotateCcw className="size-2.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
