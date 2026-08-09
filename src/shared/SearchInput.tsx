import { Search } from "lucide-react";
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
export function SearchInput({ value, onChange, placeholder, ariaLabel, className }: SearchInputProps) {
  return (
    <div className={cn("relative min-w-52 flex-1", className)}>
      <Search
        className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="ps-8"
      />
    </div>
  );
}
