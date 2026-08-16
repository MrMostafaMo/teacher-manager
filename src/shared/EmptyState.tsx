import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Optional action button rendered under the description. */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-16 text-center",
        className,
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_12%,transparent),color-mix(in_oklch,var(--chart-5)_10%,transparent))] shadow-(--card-shadow) ring-1 ring-primary/10">
        <Icon className="size-7 text-primary" />
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
