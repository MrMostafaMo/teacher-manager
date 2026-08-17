/**
 * Build a wa.me deep link. Digits only (spaces, dashes, parentheses and a
 * leading "+" are stripped); an empty result returns null so callers can
 * short-circuit before opening.
 */
export function buildWhatsAppLink(phone: string, message: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 0) return null;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encoded}`;
}

/** Short display form of a phone number (as typed by the user). */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}
