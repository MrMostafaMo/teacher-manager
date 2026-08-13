import type { TFunction } from "i18next";

/** Minimal shape needed to render text — accepts both stored and fresh items. */
export interface NotifyTextInput {
  type: string;
  details: Record<string, unknown>;
}

function rateLabel(rate: number): string {
  const pct = Math.round(rate * 100);
  return `${pct}%`;
}

/** Localized, interpolated text for a notification row (and its banner). */
export function notificationText(item: NotifyTextInput, t: TFunction): string {
  const d = item.details;
  const kind =
    d.kind === "cancelled"
      ? t("schedule.exceptions.cancelled")
      : d.kind === "moved"
        ? t("schedule.exceptions.moved")
        : typeof d.kind === "string"
          ? d.kind
          : "";
  return t(`notifications.types.${item.type}`, {
    title: typeof d.title === "string" ? d.title : "—",
    pending: typeof d.pending === "number" ? d.pending : 0,
    remaining: typeof d.remaining === "number" ? d.remaining : 0,
    period: typeof d.period === "string" ? d.period : "—",
    kind,
    date: typeof d.date === "string" ? d.date : "—",
    count: typeof d.count === "number" ? d.count : 0,
    name: typeof d.name === "string" ? d.name : "—",
    rate: typeof d.rate === "number" ? rateLabel(d.rate) : "—",
  });
}
