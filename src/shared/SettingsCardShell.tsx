import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface SettingsCardShellProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

export function SettingsCardShell({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  children,
  contentClassName,
}: SettingsCardShellProps) {
  return (
    <Card className="overflow-hidden border-primary/10">
      <div className="relative flex items-start justify-between gap-4 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_9%,transparent),color-mix(in_oklch,var(--chart-5)_7%,transparent))] px-5 py-4 ring-1 ring-primary/5">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-primary/15">
            <Icon className="size-[18px] text-primary" />
          </span>
          <div className="min-w-0">
            <h3 className="font-heading text-[15px] font-semibold leading-none">{title}</h3>
            {description && <p className="mt-1 text-xs leading-snug text-muted-foreground">{description}</p>}
          </div>
        </div>
        {(badge || actions) && (
          <div className="flex shrink-0 items-center gap-2">
            {badge}
            {actions}
          </div>
        )}
      </div>
      <CardContent className={contentClassName ?? "p-4"}>{children}</CardContent>
    </Card>
  );
}
