import i18n from "@/lib/i18n";
import dayjs from "dayjs";

/**
 * Number/date formatting helpers.
 *
 * Project decision: Latin digits (0123) in both locales, so every formatter
 * forces `numberingSystem: "latn"` regardless of the active language.
 */

const locale = () => i18n.resolvedLanguage ?? "ar";

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locale(), {
    numberingSystem: "latn",
    ...options,
  }).format(value);
}

export function formatPercent(value: number, digits = 0): string {
  return formatNumber(value, { style: "percent", maximumFractionDigits: digits });
}

export function formatDate(date: number | Date, pattern = "YYYY-MM-DD"): string {
  return dayjs(date).format(pattern);
}
