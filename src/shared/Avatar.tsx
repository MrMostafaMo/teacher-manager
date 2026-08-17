import { cn } from "@/lib/utils";

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "؟";
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("");
  return `${Array.from(words[0])[0] ?? ""}${Array.from(words[1])[0] ?? ""}`;
}

const PALETTE = [
  "bg-primary/10 text-primary",
  "bg-(--chart-2)/10 text-(--chart-2)",
  "bg-(--chart-3)/10 text-(--chart-3)",
  "bg-(--chart-4)/10 text-(--chart-4)",
  "bg-(--chart-5)/10 text-(--chart-5)",
];

export function Avatar({ name, className }: { name: string; className?: string }) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  const tone = PALETTE[hash % PALETTE.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        tone,
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
