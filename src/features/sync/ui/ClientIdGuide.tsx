import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Collapsible "how to get an OAuth Client ID" guide shown under the sign-in
 * button until the user has pasted a valid desktop client id.
 */

export function ClientIdGuide() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="text-xs text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="h-auto gap-1 px-0 text-xs font-medium text-primary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        {t("sync.settings.guide.title")}
      </Button>
      {open && (
        <ol className="mt-2 list-decimal space-y-1 ps-4">
          {["step1", "step2", "step3", "step4"].map((key) => (
            <li key={key}>{t(`sync.settings.guide.${key}`)}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
