import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { parseCombo, formatCombo, validateCombo } from "@/lib/shortcuts/combo";

interface Props {
  value: string;
  onChange: (combo: string) => void;
  isMac?: boolean;
  error?: string;
}

export function ShortcutInput({ value, onChange, isMac = false, error }: Props) {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Tab") {
        setRecording(false);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      if (e.metaKey) parts.push("meta");
      parts.push(e.key.toLowerCase());
      const combo = parts.join("+");
      const err = validateCombo(combo);
      if (err) return;
      onChange(combo);
      setRecording(false);
    },
    [onChange],
  );

  useEffect(() => {
    if (!recording) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recording, handleKeyDown]);

  const formatted = value ? formatCombo(parseCombo(value), isMac) : "";
  const hasError = !!error;

  return (
    <button
      ref={ref}
      type="button"
      role="button"
      onClick={() => setRecording(true)}
      className={cn(
        "inline-flex h-8 min-w-[80px] items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-mono transition-colors",
        recording
          ? "border-primary bg-primary/10 ring-2 ring-primary/20 animate-pulse"
          : "bg-muted/50 hover:bg-muted",
        hasError && "border-destructive",
      )}
      aria-label={t("shortcuts.pressKeys")}
    >
      {recording ? (
        <span className="animate-pulse text-muted-foreground">{t("shortcuts.pressKeys")}</span>
      ) : formatted ? (
        <kbd className="flex items-center gap-0.5">{formatted}</kbd>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </button>
  );
}
