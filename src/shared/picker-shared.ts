export type PickerProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export const triggerClass =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring dark:bg-muted/50";

export const navBtn =
  "flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground";
