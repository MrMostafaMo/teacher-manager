import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShortcutsDialog } from "@/shared/ShortcutsDialog";

export function SettingsShortcutsCard() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="size-4" />
            {t("shortcuts.title")}
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(true)}>
            {t("shortcuts.manage")}
          </Button>
        </CardContent>
      </Card>
      <ShortcutsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
