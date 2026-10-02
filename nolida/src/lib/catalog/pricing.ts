export function formatMinorPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

export function formatServicePrice(
  priceMin: number | null,
  priceMax: number | null,
  currency: string,
): string {
  const minimum = priceMin ?? priceMax;
  const maximum = priceMax ?? priceMin;
  if (minimum == null || maximum == null) return "Price on request";
  if (minimum === maximum) return formatMinorPrice(minimum, currency);
  return `${formatMinorPrice(minimum, currency)} – ${formatMinorPrice(maximum, currency)}`;
}

export function toMinorUnits(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(amount) && amount <= 2_147_483_647 ? amount : null;
}

export function fromMinorUnits(value: number | null): string {
  return value == null ? "" : (value / 100).toFixed(2).replace(/\.00$/, "");
}