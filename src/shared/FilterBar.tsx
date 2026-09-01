import { cn } from "@/lib/utils";

export function FilterBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export function FilterBarMeta({ children }: { children: React.ReactNode }) {
  return <div className="ms-auto flex flex-wrap items-center gap-2">{children}</div>;
}
