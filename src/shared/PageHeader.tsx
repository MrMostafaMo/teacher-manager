import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <h2 className="font-heading truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      <div className="h-px w-full bg-gradient-to-e from-primary/40 via-primary/10 to-transparent motion-reduce:transition-none" />
    </div>
  );
}
