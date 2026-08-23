import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SUBMISSION_STATUSES, type SubmissionStatus } from "@/features/homework/domain";

const STATUS_LABEL_KEY: Record<SubmissionStatus, string> = {
  submitted: "homework.statusSubmitted",
  pending: "homework.statusPending",
  late: "homework.statusLate",
};

const STATUS_BADGE: Record<SubmissionStatus, string> = {
  submitted: "border-success bg-success/15 text-success",
  pending: "border-input text-muted-foreground",
  late: "border-warning bg-warning/15 text-warning",
};

export function SubmissionStatusPicker({
  value,
  disabled,
  onChange,
}: {
  value: SubmissionStatus;
  disabled: boolean;
  onChange: (s: SubmissionStatus) => void;
}) {
  const { t } = useTranslation();
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const buttons = Array.from((e.currentTarget as HTMLDivElement).querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;
    const next = e.key === "ArrowRight" ? (idx + 1) % buttons.length : (idx - 1 + buttons.length) % buttons.length;
    buttons[next].focus();
  }
  return (
    <div role="group" aria-label={t("homework.columns.status")} className="flex gap-1" onKeyDown={onKeyDown}>
      {SUBMISSION_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={value === s}
          disabled={disabled}
          onClick={() => onChange(s)}
          className={cn(
            "rounded-lg border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            value === s ? STATUS_BADGE[s] : "border-input text-muted-foreground hover:bg-muted/50",
          )}
        >
          {t(STATUS_LABEL_KEY[s])}
        </button>
      ))}
    </div>
  );
}
