import type { NormalizedEventTier } from "@/types/tier";

export const TICKET_CURRENCY = "INR" as const;
export const TICKET_CURRENCY_LOCALE = "en-IN";
export const MAX_SERVICE_FEE_MINOR = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function toMinorUnits(value: number) {
  return Math.round(value * 100);
}

export function fromMinorUnits(value: number) {
  return value / 100;
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat(TICKET_CURRENCY_LOCALE, {
    style: "currency",
    currency: TICKET_CURRENCY,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatMinorMoney(value: number) {
  return formatMoney(fromMinorUnits(value));
}

export function calculateServiceFeeMinor(subtotalMinor: number) {
  return Math.min(
    MAX_SERVICE_FEE_MINOR,
    Math.max(0, Math.round(subtotalMinor * 0.02)),
  );
}

export function calculateServiceFee(subtotal: number) {
  return fromMinorUnits(calculateServiceFeeMinor(toMinorUnits(subtotal)));
}

export function normalizeEventTiers(
  prices: unknown,
  fallbackSeats: number,
): NormalizedEventTier[] {
  if (!Array.isArray(prices)) return [];

  return prices.map((item, index) => {
    if (!isRecord(item)) {
      return {
        id: `tier-${index + 1}`,
        name: `Tier ${index + 1}`,
        price: 0,
        seats: Math.max(0, fallbackSeats),
      };
    }

    const id =
      typeof item.id === "string" && item.id.trim().length > 0
        ? item.id
        : `tier-${index + 1}`;
    const name =
      typeof item.name === "string" && item.name.trim().length > 0
        ? item.name
        : `Tier ${index + 1}`;
    const price = Math.max(0, toFiniteNumber(item.price, 0));
    const seats = Math.max(0, toFiniteNumber(item.seats, fallbackSeats));

    return {
      id,
      name,
      price,
      seats,
      note: typeof item.note === "string" ? item.note : undefined,
    };
  });
}

export function totalSeatsFromTiers(prices: unknown) {
  return normalizeEventTiers(prices, 0).reduce((sum, tier) => {
    return sum + tier.seats;
  }, 0);
}

export function buildMapEmbedUrl(location: string) {
  const query = encodeURIComponent(location);
  return `https://maps.google.com/maps?width=650&height=400&hl=en&q=${query}&t=&z=14&ie=UTF8&iwloc=B&output=embed`;
}

export function buildMapSearchUrl(location: string) {
  const query = encodeURIComponent(location);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
