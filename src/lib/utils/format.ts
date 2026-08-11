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

/**
 * Money amounts: Latin digits with thousands separators plus a localized
 * currency suffix (ج.م / EGP). The number is wrapped in LRI/PDI so the digits
 * stay a single bidi-isolated unit inside Arabic (RTL) paragraphs — otherwise
 * WebKit reorders digits around the Arabic suffix.
 */
export function formatMoney(value: number): string {
  const number = formatNumber(value, { maximumFractionDigits: 0 });
  return `\u2066${number}\u2069 ${i18n.t("common.currency")}`;
}

export function formatDate(date: number | Date, pattern = "DD-MM-YYYY"): string {
  return dayjs(date).format(pattern);
}

/**
 * 24h "HH:mm" -> 12h "hh:mm AM/PM". Built by hand, not dayjs,
 * because the dayjs `ar` locale's postformat would emit Arabic-Indic digits,
 * violating the Latin-digits rule.
 *
 * Wrapped in LRI/PDI (U+2066/U+2069) so the Latin time token is a single
 * bidi-isolated unit inside Arabic (RTL) paragraphs — otherwise WebKit reorders
 * the digits (e.g. "04:30" → "30:04").
 */
export function formatTime(time: string, hour24: boolean): string {
  const out = hour24
    ? time
    : (() => {
        const [h, m] = time.split(":").map(Number);
        const hr = ((h % 12) || 12).toString().padStart(2, "0");
        const suffix = h < 12 ? i18n.t("common.am") : i18n.t("common.pm");
        return `${hr}:${String(m).padStart(2, "0")} ${suffix}`;
      })();
  return `\u2066${out}\u2069`;
}

export function formatDateTime(ms: number, hour24: boolean): string {
  return `${formatDate(ms, "DD-MM-YYYY")} ${formatTime(dayjs(ms).format("HH:mm"), hour24)}`;
}

/** Stored ISO date strings ("YYYY-MM-DD") → "DD-MM-YYYY". Schema guarantees the format. */
export function formatDateString(iso: string | null): string {
  if (!iso) return "—";
  return iso.split("-").reverse().join("-");
}
