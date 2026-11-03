import { describe, it, expect } from 'vitest';
import {
  canReserveStock,
  calculateSavings,
  isListingActiveAndFresh,
  generatePickupCode,
  sanitizeDietTags,
} from '@/server/domain/food';

describe('Food Rescue Domain Logic', () => {
  describe('canReserveStock', () => {
    it('allows reservation when remaining stock is sufficient', () => {
      expect(canReserveStock(2, 10, 3)).toBe(true);
      expect(canReserveStock(0, 5, 5)).toBe(true);
      expect(canReserveStock(4, 5, 1)).toBe(true);
    });

    it('rejects reservation when requested quantity exceeds available stock', () => {
      expect(canReserveStock(4, 5, 2)).toBe(false);
      expect(canReserveStock(5, 5, 1)).toBe(false);
      expect(canReserveStock(10, 10, 1)).toBe(false);
    });

    it('rejects non-positive and fractional quantities', () => {
      expect(canReserveStock(0, 10, 0)).toBe(false);
      expect(canReserveStock(0, 10, -2)).toBe(false);
      expect(canReserveStock(0, 10, 1.5)).toBe(false);
    });
  });

  describe('calculateSavings', () => {
    it('computes exact paise savings and rounded discount percentage', () => {
      // Original ₹200 (20000 paise), discounted ₹80 (8000 paise)
      const result = calculateSavings(20000, 8000);
      expect(result.discountPaise).toBe(12000);
      expect(result.discountPercent).toBe(60);
    });

    it('handles rounding for non-clean percentages', () => {
      // 10000 -> 6667 (33.33% off)
      const result = calculateSavings(10000, 6667);
      expect(result.discountPaise).toBe(3333);
      expect(result.discountPercent).toBe(33);
    });

    it('returns zero savings if original price is null, zero, or discounted is higher', () => {
      expect(calculateSavings(null, 5000)).toEqual({ discountPaise: 0, discountPercent: 0 });
      expect(calculateSavings(10000, null)).toEqual({ discountPaise: 0, discountPercent: 0 });
      expect(calculateSavings(0, 0)).toEqual({ discountPaise: 0, discountPercent: 0 });
      expect(calculateSavings(5000, 6000)).toEqual({ discountPaise: 0, discountPercent: 0 });
    });
  });

  describe('isListingActiveAndFresh', () => {
    const baseListing = {
      active: true,
      quantity: 10,
      reserved: 2,
      pickupEnd: new Date(Date.now() + 3600 * 1000), // in 1 hr
      consumeBy: new Date(Date.now() + 7200 * 1000), // in 2 hrs
    };

    it('returns true when listing is active, has stock, and within pickup window', () => {
      expect(isListingActiveAndFresh(baseListing)).toBe(true);
    });

    it('returns false if listing is marked inactive', () => {
      expect(isListingActiveAndFresh({ ...baseListing, active: false })).toBe(false);
    });

    it('returns false if listing is fully reserved', () => {
      expect(isListingActiveAndFresh({ ...baseListing, reserved: 10 })).toBe(false);
    });

    it('returns false if pickupEnd has passed', () => {
      expect(
        isListingActiveAndFresh({
          ...baseListing,
          pickupEnd: new Date(Date.now() - 60000), // 1 min ago
        })
      ).toBe(false);
    });

    it('returns false if consumeBy has passed', () => {
      expect(
        isListingActiveAndFresh({
          ...baseListing,
          consumeBy: new Date(Date.now() - 60000),
        })
      ).toBe(false);
    });
  });

  describe('generatePickupCode', () => {
    it('generates a 4-character uppercase alphanumeric code without ambiguous chars', () => {
      const code = generatePickupCode();
      expect(code).toHaveLength(4);
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
      expect(code).not.toContain('0');
      expect(code).not.toContain('O');
      expect(code).not.toContain('1');
      expect(code).not.toContain('I');
    });
  });

  describe('sanitizeDietTags', () => {
    it('filters out invalid tags and normalizes casing', () => {
      const tags = ['veg', 'VEGAN', 'RANDOM_JUNK', 'Halal', 'veg'];
      const sanitized = sanitizeDietTags(tags);
      expect(sanitized).toEqual(['VEG', 'VEGAN', 'HALAL']);
    });
  });
});
