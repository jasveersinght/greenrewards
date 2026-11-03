import { describe, it, expect } from 'vitest';
import {
  computeUnitsPerDay,
  evaluateElectricityChallenge,
} from '@/server/domain/electricityChallenge';

describe('Electricity Challenge Domain Logic', () => {
  it('normalizes bimonthly bills with varying billing cycle days (59 vs 62 days)', () => {
    // 59 days cycle: 590 units = 10 units/day
    const cycle59 = computeUnitsPerDay(590, new Date('2026-06-01'), new Date('2026-07-30'));
    expect(cycle59.daysInCycle).toBe(59);
    expect(cycle59.unitsPerDay).toBe(10);

    // 62 days cycle: 620 units = 10 units/day
    const cycle62 = computeUnitsPerDay(620, new Date('2026-07-01'), new Date('2026-09-01'));
    expect(cycle62.daysInCycle).toBe(62);
    expect(cycle62.unitsPerDay).toBe(10);
  });

  it('declares user ineligible if fewer than 3 historical bills exist', () => {
    const historicalBills = [
      {
        units: 400,
        billingStart: new Date('2026-01-01'),
        billingEnd: new Date('2026-03-01'),
      },
      {
        units: 380,
        billingStart: new Date('2026-03-01'),
        billingEnd: new Date('2026-05-01'),
      },
    ];

    const currentBill = {
      units: 300,
      billingStart: new Date('2026-05-01'),
      billingEnd: new Date('2026-07-01'),
    };

    const res = evaluateElectricityChallenge({
      currentBill,
      historicalBills,
      selfReportedProfileAverage: 1000, // Inflated profile input must be ignored!
    });

    expect(res.eligible).toBe(false);
    expect(res.achieved).toBe(false);
    expect(res.baselineType).toBe('INSUFFICIENT_HISTORY');
    expect(res.reason).toContain('minimum 3 previous bills required');
  });

  it('compares to actual own baseline and awards 150 points for >= 10% reduction', () => {
    // 3 historical bills with baseline ~10 units/day
    const historicalBills = [
      {
        units: 600,
        billingStart: new Date('2025-05-01'),
        billingEnd: new Date('2025-06-30'), // 60 days -> 10 units/day
      },
      {
        units: 600,
        billingStart: new Date('2025-07-01'),
        billingEnd: new Date('2025-08-30'), // 60 days -> 10 units/day
      },
      {
        units: 600,
        billingStart: new Date('2025-09-01'),
        billingEnd: new Date('2025-10-31'), // 61 days -> ~9.83 units/day
      },
    ];

    // Current bill with 15% reduction: 510 units over 60 days = 8.5 units/day (15% reduction)
    const currentBill = {
      units: 510,
      billingStart: new Date('2026-05-01'),
      billingEnd: new Date('2026-06-30'), // 60 days -> 8.5 units/day
    };

    const res = evaluateElectricityChallenge({
      currentBill,
      historicalBills,
      selfReportedProfileAverage: 2000, // Must ignore!
    });

    expect(res.eligible).toBe(true);
    expect(res.achieved).toBe(true);
    expect(res.pointsAwarded).toBe(150);
    expect(res.reductionPercent).toBeGreaterThanOrEqual(10);
  });

  it('rejects claim if reduction is below 10%', () => {
    const historicalBills = [
      {
        units: 600,
        billingStart: new Date('2025-05-01'),
        billingEnd: new Date('2025-06-30'),
      },
      {
        units: 600,
        billingStart: new Date('2025-07-01'),
        billingEnd: new Date('2025-08-30'),
      },
      {
        units: 600,
        billingStart: new Date('2025-09-01'),
        billingEnd: new Date('2025-10-31'),
      },
    ];

    // Current bill only reduced by 5% (570 units over 60 days = 9.5 units/day)
    const currentBill = {
      units: 570,
      billingStart: new Date('2026-05-01'),
      billingEnd: new Date('2026-06-30'),
    };

    const res = evaluateElectricityChallenge({
      currentBill,
      historicalBills,
    });

    expect(res.eligible).toBe(true);
    expect(res.achieved).toBe(false);
    expect(res.pointsAwarded).toBe(0);
    expect(res.reason).toContain('10% reduction required');
  });
});
