/**
 * Support channel helpers.
 *
 * NEXT_PUBLIC_SUPPORT_WHATSAPP may be stored either as a full URL or as a
 * phone number (with or without +, spaces, or dashes). Anything we cannot
 * turn into a link returns null so callers can render a disabled state
 * instead of a broken anchor.
 */
export function buildWhatsAppHref(
  value: string | undefined | null,
): string | null {
  const trimmed = (value ?? "").trim();
  if (trimmed.length === 0) return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  return digits.length > 0 ? `https://wa.me/${digits}` : null;
}
