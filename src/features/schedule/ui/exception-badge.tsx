import { useTranslation } from "react-i18next";
import { ArrowRightLeft, Ban, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small status line marking an occurrence as cancelled, moved or extra. */
export function ExceptionBadge({
  type,
  suffix,
  className,
}: {
  type: "cancelled" | "moved" | "added";
  /** Short qualifier (e.g. the other date of a cross-day move). */
  suffix?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  if (type === "added") {
    return (
      <p
        className={cn(
          "mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-tight text-success",
          className,
        )}
      >
        <Plus className="size-3" />
        {t("schedule.exceptions.added")}
        {suffix && <span className="truncate"> · {suffix}</span>}
      </p>
    );
  }
  if (type === "cancelled") {
    return (
      <p
        className={cn(
          "mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-tight text-destructive",
          className,
        )}
      >
        <Ban className="size-3" />
        {t("schedule.exceptions.cancelled")}
      </p>
    );
  }
  return (
    <p
      className={cn(
          "mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-tight text-warning",
        className,
      )}
    >
      <ArrowRightLeft className="size-3" />
      {t("schedule.exceptions.moved")}
      {suffix && <span className="truncate"> · {suffix}</span>}
    </p>
  );
}
