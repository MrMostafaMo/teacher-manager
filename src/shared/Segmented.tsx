import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel?: string;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("relative flex gap-1 rounded-lg bg-muted p-1", className)}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Button
            key={o.value}
            variant="ghost"
            size="sm"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 transition-colors duration-200",
              active
                ? "bg-background text-foreground shadow-sm font-medium hover:bg-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {o.label}
          </Button>
        );
      })}
    </div>
  );
}
