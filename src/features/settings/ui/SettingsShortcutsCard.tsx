import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function SettingsShortcutsCard() {
  const { t } = useTranslation();
  const shortcuts = useShortcutsStore((s) => s.shortcuts);
  const setShortcut = useShortcutsStore((s) => s.setShortcut);
  const resetShortcut = useShortcutsStore((s) => s.resetShortcut);
  const resetShortcuts = useShortcutsStore((s) => s.resetShortcuts);
  const findDuplicate = useShortcutsStore((s) => s.findDuplicate);
  const [dups, setDups] = useState<Record<string, string>>({});

  const isMac =
    typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

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
      const { [id]: _, ...rest } = d;
      return rest;
    });
    setShortcut(id, combo);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="size-4" />
            {t("shortcuts.title")}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetShortcuts}
            className="h-8 gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="size-3.5" />
            {t("shortcuts.restoreAll")}
          </Button>
        </div>
        <div className="space-y-4">
          {GROUP_ORDER.map((group) => (
            <div key={group}>
              <h4 className="mb-2 text-xs font-medium uppercase text-muted-foreground">
                {t(`shortcuts.${group}`)}
              </h4>
              <div className="space-y-1.5">
                {(grouped[group] ?? []).map((def) => (
                  <div
                    key={def.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm">
                      {t(LABEL_KEYS[def.id] ?? def.id)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <ShortcutInput
                        value={shortcuts[def.id] ?? def.defaultCombo}
                        onChange={(c) => handleChange(def.id, c)}
                        isMac={isMac}
                        error={dups[def.id]}
                      />
                      {(shortcuts[def.id] ?? "") !== def.defaultCombo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetShortcut(def.id)}
                          className="h-8 w-8 p-0"
                          aria-label={t("shortcuts.restoreDefaults")}
                        >
                          <RotateCcw className="size-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
