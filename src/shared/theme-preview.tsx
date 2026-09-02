import { useTranslation } from "react-i18next";

/** Tiny live preview that reflects the current resolved theme via CSS vars. */
export function ThemePreview() {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border bg-card p-3 shadow-card">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{t("settings.appearance")}</p>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-7 items-center rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm">
          Primary
        </span>
        <span className="inline-flex h-7 items-center rounded-full bg-accent px-3 text-xs font-medium text-accent-foreground">
          Accent
        </span>
        <span className="inline-flex h-7 items-center rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground">
          Muted
        </span>
      </div>
      <div className="mt-3 flex gap-1.5">
        <span className="h-2 flex-1 rounded-full bg-[var(--chart-1)]" />
        <span className="h-2 flex-1 rounded-full bg-[var(--chart-2)]" />
        <span className="h-2 flex-1 rounded-full bg-[var(--chart-3)]" />
        <span className="h-2 flex-1 rounded-full bg-[var(--chart-4)]" />
        <span className="h-2 flex-1 rounded-full bg-[var(--chart-5)]" />
      </div>
      <div className="mt-2 flex gap-1.5">
        <span className="h-6 flex-1 rounded-md bg-background ring-1 ring-border" />
        <span className="h-6 flex-1 rounded-md bg-card shadow-sm ring-1 ring-border" />
        <span className="h-6 flex-1 rounded-md bg-popover shadow-sm ring-1 ring-border" />
      </div>
    </div>
  );
}
