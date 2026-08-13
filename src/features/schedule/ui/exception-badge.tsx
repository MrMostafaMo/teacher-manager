import { useTranslation } from "react-i18next";
import { ArrowRightLeft, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small status line marking an occurrence as cancelled or moved. */
export function ExceptionBadge({
  type,
  className,
}: {
  type: "cancelled" | "moved";
  className?: string;
}) {
  const { t } = useTranslation();
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
        "mt-0.5 flex items-center gap-0.5 text-[11px] font-medium leading-tight text-amber-600 dark:text-amber-400",
        className,
      )}
    >
      <ArrowRightLeft className="size-3" />
      {t("schedule.exceptions.moved")}
    </p>
  );
}
