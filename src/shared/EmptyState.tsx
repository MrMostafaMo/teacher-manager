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

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn("flex min-h-[200px] flex-col items-center justify-center gap-2 py-10 text-center", className)}
    >
      <div className="relative flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_12%,transparent),color-mix(in_oklch,var(--chart-5)_10%,transparent))] shadow-(--card-shadow) ring-1 ring-primary/10">
        <div className="relative flex items-center justify-center before:absolute before:inset-[-8px] before:rounded-full before:ring-1 before:ring-primary/20 after:absolute after:inset-[-16px] after:rounded-full after:ring-1 after:ring-primary/10">
          <Icon aria-hidden="true" className="size-7 text-primary animate-[float_3s_ease-in-out_infinite] motion-reduce:animate-none" />
        </div>
        <Icon
          aria-hidden="true"
          className="pointer-events-none absolute -end-4 -top-4 size-16 text-muted-foreground/10 rtl:-scale-x-100"
        />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
