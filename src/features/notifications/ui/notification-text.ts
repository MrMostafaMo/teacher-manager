import type { TFunction } from "i18next";
import type { ActiveNotification } from "@/features/notifications/application/notification-query-cases";

function rateLabel(rate: number): string {
  const pct = Math.round(rate * 100);
  return `${pct}%`;
}

/** Localized, interpolated text for a notification row (and its banner). */
export function notificationText(item: ActiveNotification, t: TFunction): string {
  const d = item.details;
  const kind =
    d.kind === "cancelled"
      ? t("schedule.exceptions.cancelled")
      : d.kind === "moved"
        ? t("schedule.exceptions.moved")
        : d.kind ?? "";
  return t(`notifications.types.${item.type}`, {
    title: d.title ?? "—",
    pending: d.pending ?? 0,
    remaining: d.remaining ?? 0,
    period: d.period ?? "—",
    kind,
    date: d.date ?? "—",
    count: d.count ?? 0,
    name: d.name ?? "—",
    rate: d.rate != null ? rateLabel(d.rate) : "—",
  });
}
