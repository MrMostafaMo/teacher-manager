import { useId, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A section card with a collapsible header (collapse state is up to the caller). */
export function CollapsibleSection({
  title,
  meta,
  actions,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const contentId = useId();

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="-ms-2 min-w-0 flex-1 justify-start gap-2 px-2"
            aria-expanded={!collapsed}
            aria-controls={contentId}
            title={collapsed ? t("common.expand") : t("common.collapse")}
            onClick={onToggle}
          >
            <ChevronDown
              className={cn("size-4 shrink-0 transition-transform", !collapsed && "rotate-180")}
            />
            <span className="truncate font-semibold">{title}</span>
            {meta && (
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{meta}</span>
            )}
          </Button>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
        {!collapsed && <div id={contentId}>{children}</div>}
      </CardContent>
    </Card>
  );
}
