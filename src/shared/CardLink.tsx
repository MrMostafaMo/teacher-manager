import type { ReactNode } from "react";
import { Link } from "react-router";
import { MoveUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A Card that navigates to `to` when clicked anywhere on it. */
export function CardLink({
  to,
  label,
  className,
  children,
}: {
  to: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "group border-s-2 border-transparent transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--card-shadow-hover)] hover:ring-primary/30",
        className,
      )}
    >
      <Link
        to={to}
        aria-label={label}
        className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative"
      >
        {children}
        <MoveUpRight className="absolute top-4 end-4 size-5 opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100 text-muted-foreground" />
      </Link>
    </Card>
  );
}
