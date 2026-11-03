/**
 * Domain logic for Food Rescue: surplus food discount listings,
 * concurrency-safe inventory checks, and NGO donation parcels.
 */

export interface FoodSavings {
  discountPaise: number;
  discountPercent: number;
}

/**
 * Checks whether requested quantity can be reserved without overselling.
 */
export function canReserveStock(
  currentReserved: number,
  totalQuantity: number,
  requestedQuantity: number
): boolean {
  if (requestedQuantity <= 0) return false;
  if (!Number.isInteger(requestedQuantity)) return false;
  return currentReserved + requestedQuantity <= totalQuantity;
}

/**
 * Calculates financial savings between original and discounted price in paise.
 */
export function calculateSavings(
  originalPricePaise?: number | null,
  discountedPricePaise?: number | null
): FoodSavings {
  if (
    originalPricePaise == null ||
    discountedPricePaise == null ||
    originalPricePaise <= 0 ||
    discountedPricePaise >= originalPricePaise
  ) {
    return { discountPaise: 0, discountPercent: 0 };
  }

  const discountPaise = originalPricePaise - discountedPricePaise;
  const discountPercent = Math.round((discountPaise / originalPricePaise) * 100);
  return { discountPaise, discountPercent };
}

/**
 * Validates whether a food listing is currently active, within pickup window, and not spoiled.
 */
export function isListingActiveAndFresh(
  listing: {
    active: boolean;
    quantity: number;
    reserved: number;
    pickupEnd?: Date | string | null;
    consumeBy?: Date | string | null;
  },
  now: Date = new Date()
): boolean {
  if (!listing.active) return false;
  if (listing.reserved >= listing.quantity) return false;

  const nowMs = now.getTime();

  if (listing.pickupEnd) {
    const endMs = new Date(listing.pickupEnd).getTime();
    if (nowMs > endMs) return false;
  }

  if (listing.consumeBy) {
    const consumeMs = new Date(listing.consumeBy).getTime();
    if (nowMs > consumeMs) return false;
  }

  return true;
}

/**
 * Generates an easy-to-read 4-character pickup code for counter verification.
 * Avoids ambiguous characters like '0', 'O', '1', 'I'.
 */
export function generatePickupCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    code += chars[idx];
  }
  return code;
}

/**
 * Sanitizes and formats dietary allergen tags.
 */
export const ALLOWED_DIET_TAGS = ['VEG', 'NON_VEG', 'VEGAN', 'DAIRY_FREE', 'NUT_FREE', 'HALAL', 'JAIN'] as const;
export type DietTag = (typeof ALLOWED_DIET_TAGS)[number];

export function sanitizeDietTags(tags: string[]): string[] {
  const allowedSet = new Set<string>(ALLOWED_DIET_TAGS);
  return Array.from(new Set(tags.map((t) => t.toUpperCase().trim()).filter((t) => allowedSet.has(t))));
}
