/**
 * Build a wa.me deep link. Digits only (spaces, dashes, parentheses and a
 * leading "+" are stripped); returns null for empty/too-short/too-long
 * numbers so callers can short-circuit before opening. Callers should pass
 * the full international number (e.g. Egyptian `01…` needs its `20` prefix).
 */
export function buildWhatsAppLink(phone: string, message: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  // E.164 international numbers are 7–15 digits; anything else is rejected
  // by WhatsApp (e.g. a lone "0" or a 2000-char paste).
  if (digits.length < 7 || digits.length > 15) return null;
  if (message.length > 1500) return null;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

/** Short display form of a phone number (as typed by the user). */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}
