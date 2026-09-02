import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsCardShell } from "@/shared/SettingsCardShell";
import { ShortcutsDialog } from "@/shared/ShortcutsDialog";

export function SettingsShortcutsCard() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsCardShell
        icon={Keyboard}
        title={t("shortcuts.title")}
        description={t("shortcuts.hint")}
        actions={
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>
            {t("shortcuts.manage")}
          </Button>
        }
      >
        <div className="flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-md bg-muted px-2 py-1 font-mono ring-1 ring-border">Ctrl</span>
          <span className="text-muted-foreground">+</span>
          <span className="rounded-md bg-muted px-2 py-1 font-mono ring-1 ring-border">K</span>
          <span className="ms-1 text-muted-foreground">{t("shortcuts.paletteHint")}</span>
        </div>
      </SettingsCardShell>
      <ShortcutsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
