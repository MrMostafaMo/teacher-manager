import { cloneElement, isValidElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FieldProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  error?: string;
  className?: string;
  children: ReactNode;
}

/** Label + control + inline error; wires aria-invalid/describedby onto the
 * control so Zod messages are announced (works for the single-control usage
 * every dialog follows). */
export function Field({ id, label, required, error, className, children }: FieldProps) {
  const errorId = `${id}-error`;
  const control =
    isValidElement(children) && typeof children.type !== "string"
      ? cloneElement(children as never, {
          id: (children.props as { id?: string }).id ?? id,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? errorId : undefined,
        })
      : children;
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden="true">
            {" "}
            *
          </span>
        )}
      </Label>
      {control}
      {error && <p id={errorId} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
