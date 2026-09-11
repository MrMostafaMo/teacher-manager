import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/** Text filter input with a leading search icon, shared across list pages. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative min-w-52 flex-1 focus-within:ring-2 focus-within:ring-primary/20 rounded-lg transition-shadow duration-200", className)}>
      <Search
        className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("ps-8", value ? "pe-8" : "")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="clear"
          className="absolute inset-y-0 end-0 flex items-center justify-center px-2.5 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
