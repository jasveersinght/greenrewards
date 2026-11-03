import { describe, it, expect } from 'vitest';
import {
  applyKAnonymity,
  calculateCarbonAvoidedKg,
  calculateBudgetUtilization,
} from '@/server/domain/impact';

describe('Impact & Privacy Domain Logic', () => {
  describe('applyKAnonymity', () => {
    it('suppresses counts strictly less than threshold (< 5)', () => {
      expect(applyKAnonymity(0)).toBe('< 5');
      expect(applyKAnonymity(1)).toBe('< 5');
      expect(applyKAnonymity(4)).toBe('< 5');
    });

    it('returns exact count when meeting or exceeding threshold (>= 5)', () => {
      expect(applyKAnonymity(5)).toBe(5);
      expect(applyKAnonymity(42)).toBe(42);
      expect(applyKAnonymity(100)).toBe(100);
    });

    it('honors custom threshold parameter', () => {
      expect(applyKAnonymity(8, 10)).toBe('< 10');
      expect(applyKAnonymity(10, 10)).toBe(10);
    });
  });

  describe('calculateCarbonAvoidedKg', () => {
    it('calculates aggregate carbon avoided across all four vectors', () => {
      const metrics = {
        stampsAvoidedBags: 100, // 100 * 0.04 = 4.0 kg
        mealsRescued: 20,       // 20 * 2.50 = 50.0 kg
        transitTrips: 10,       // 10 * 1.80 = 18.0 kg
        kwhSaved: 50,           // 50 * 0.82 = 41.0 kg
      };
      // Total = 4.0 + 50.0 + 18.0 + 41.0 = 113.0 kg
      expect(calculateCarbonAvoidedKg(metrics)).toBe(113);
    });

    it('handles zero or negative inputs gracefully', () => {
      const metrics = {
        stampsAvoidedBags: 0,
        mealsRescued: 0,
        transitTrips: 0,
        kwhSaved: 0,
      };
      expect(calculateCarbonAvoidedKg(metrics)).toBe(0);
    });
  });

  describe('calculateBudgetUtilization', () => {
    it('calculates percent spent and remaining paise', () => {
      // Budget ₹10,000 (1000000 paise), spent ₹2,500 (250000 paise) -> 25% spent, 750000 remaining
      const res = calculateBudgetUtilization(1000000, 250000);
      expect(res.percentSpent).toBe(25);
      expect(res.remainingPaise).toBe(750000);
    });

    it('handles fully depleted or zero budget', () => {
      const res1 = calculateBudgetUtilization(500000, 500000);
      expect(res1.percentSpent).toBe(100);
      expect(res1.remainingPaise).toBe(0);

      const res2 = calculateBudgetUtilization(0, 0);
      expect(res2.percentSpent).toBe(0);
      expect(res2.remainingPaise).toBe(0);
    });
  });
});
