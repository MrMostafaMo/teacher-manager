import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CountBadge({
  icon: Icon,
  children,
  variant = "secondary",
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  variant?: React.ComponentProps<typeof Badge>["variant"];
  className?: string;
}) {
  return (
    <Badge variant={variant} className={cn("gap-1.5 tabular-nums", className)}>
      {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
      {children}
    </Badge>
  );
}
