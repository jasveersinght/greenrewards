import { describe, it, expect } from 'vitest';
import { POINTS_CONFIG, computeAvailableAt } from '@/server/domain/pointsConfig';
import {
  evaluateGlobalMonthlyCap,
  evaluateDailyReuseCap,
  evaluateMonthlyLeakCap,
  evaluateDailyTransitCap,
} from '@/server/domain/caps';

describe('Points Configuration & Earning Table', () => {
  it('defines canonical point values for all sustainability actions', () => {
    expect(POINTS_CONFIG.EARNING.REUSE_STAMP).toBe(10);
    expect(POINTS_CONFIG.EARNING.STAMP_CARD_BONUS).toBe(40);
    expect(POINTS_CONFIG.EARNING.LEAK_REPORT_ACCEPTED).toBe(50);
    expect(POINTS_CONFIG.EARNING.LEAK_REPAIR_VERIFIED).toBe(100);
    expect(POINTS_CONFIG.EARNING.FOOD_PICKUP_COMPLETED).toBe(15);
    expect(POINTS_CONFIG.EARNING.TRANSIT_TRIP_REVIEWED).toBe(5);
    expect(POINTS_CONFIG.EARNING.TRANSIT_STREAK_BONUS).toBe(25);
    expect(POINTS_CONFIG.EARNING.ELECTRICITY_10PCT_REDUCTION).toBe(150);
    expect(POINTS_CONFIG.EARNING.HOUSEHOLD_WATER_REPAIR_VERIFIED).toBe(75);
  });

  it('computes settlement date based on DEMO_FAST_SETTLE flag', () => {
    const orig = process.env.DEMO_FAST_SETTLE;
    try {
      process.env.DEMO_FAST_SETTLE = 'true';
      const fastDate = computeAvailableAt();
      const diffMs = fastDate.getTime() - Date.now();
      expect(diffMs).toBeLessThanOrEqual(65 * 1000); // ~1 minute

      process.env.DEMO_FAST_SETTLE = 'false';
      const normalDate = computeAvailableAt();
      const diffDays = (normalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(7); // 7 days
    } finally {
      process.env.DEMO_FAST_SETTLE = orig;
    }
  });
});

describe('Action Caps & Anti-Spam Limits', () => {
  it('enforces monthly global cap of 500 points', () => {
    expect(evaluateGlobalMonthlyCap(450, 40).awardedPoints).toBe(40);
    expect(evaluateGlobalMonthlyCap(480, 50).awardedPoints).toBe(20); // capped at 500
    expect(evaluateGlobalMonthlyCap(500, 10).awardedPoints).toBe(0);
    expect(evaluateGlobalMonthlyCap(520, 10).capped).toBe(true);
  });

  it('enforces daily reuse stamp cap of 2 per shop', () => {
    expect(evaluateDailyReuseCap(0, 10).awardedPoints).toBe(10);
    expect(evaluateDailyReuseCap(1, 10).awardedPoints).toBe(10);
    expect(evaluateDailyReuseCap(2, 10).awardedPoints).toBe(0);
    expect(evaluateDailyReuseCap(2, 10).capped).toBe(true);
  });

  it('enforces monthly leak report cap of 3 per user', () => {
    expect(evaluateMonthlyLeakCap(2, 50).awardedPoints).toBe(50);
    expect(evaluateMonthlyLeakCap(3, 50).awardedPoints).toBe(0);
    expect(evaluateMonthlyLeakCap(3, 50).capped).toBe(true);
  });

  it('enforces daily transit trip cap of 2 per day', () => {
    expect(evaluateDailyTransitCap(1, 5).awardedPoints).toBe(5);
    expect(evaluateDailyTransitCap(2, 5).awardedPoints).toBe(0);
    expect(evaluateDailyTransitCap(2, 5).capped).toBe(true);
  });
});
