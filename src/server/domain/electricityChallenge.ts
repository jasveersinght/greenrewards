/**
 * Electricity reduction challenge domain rules.
 * Uses the citizen's OWN historical utility bills (per-day normalization for bimonthly cycles).
 * ML model is strictly an informational insight and never determines reward eligibility.
 */

export const ELECTRICITY_PROVIDER_NAME = 'TNPDCL (formerly TANGEDCO)';

export interface BillPeriodData {
  id: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  units: number; // in kWh
  amountPaise?: number;
  imageUrl?: string | null;
}

export interface ElectricityChallengeResult {
  eligible: boolean;
  baselineUnitsPerDay: number;
  currentUnitsPerDay: number;
  currentPeriodDays: number;
  baselinePeriodDays: number;
  reductionPercent: number;
  achieved: boolean;
  pointsToAward: number;
  pointsAwarded?: number;
  baselineType: 'SAME_PERIOD_LAST_YEAR' | 'THREE_BILL_AVERAGE' | 'INSUFFICIENT_HISTORY';
  reason?: string;
}

/**
 * Computes average units consumed per day.
 * Ensures fair comparison across varying bimonthly cycle lengths (e.g. 59 days vs 62 days).
 */
export function computeUnitsPerDay(
  units: number,
  periodStart: Date | string,
  periodEnd: Date | string
): { unitsPerDay: number; days: number; daysInCycle: number } {
  const start = periodStart instanceof Date ? periodStart : new Date(periodStart);
  const end = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);
  const diffMs = Math.max(1, end.getTime() - start.getTime());
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  const unitsPerDay = units / days;
  return { unitsPerDay, days, daysInCycle: days };
}

export function evaluateElectricityChallenge(params: {
  currentBill: { units: number; billingStart?: Date; billingEnd?: Date; periodStart?: Date; periodEnd?: Date };
  historicalBills: Array<{ units: number; billingStart?: Date; billingEnd?: Date; periodStart?: Date; periodEnd?: Date }>;
  selfReportedProfileAverage?: number;
}) {
  const normalizedCurrent: BillPeriodData = {
    id: 'current',
    units: params.currentBill.units,
    periodStart: params.currentBill.periodStart || params.currentBill.billingStart || new Date(),
    periodEnd: params.currentBill.periodEnd || params.currentBill.billingEnd || new Date(),
  };

  const normalizedHistorical: BillPeriodData[] = params.historicalBills.map((b, idx) => ({
    id: `hist-${idx}`,
    units: b.units,
    periodStart: b.periodStart || b.billingStart || new Date(),
    periodEnd: b.periodEnd || b.billingEnd || new Date(),
  }));

  const res = evaluateElectricityReduction(normalizedCurrent, normalizedHistorical);
  return {
    ...res,
    pointsAwarded: res.pointsToAward,
  };
}

/**
 * Evaluates 10% reduction challenge vs user's OWN baseline.
 * Baseline hierarchy:
 * 1. Same billing period last year (~365 days ago, +/- 45 days)
 * 2. Average of last 3 actual bills (minimum 3 required)
 * 3. Fewer than 3 bills => Ineligible (needs more history)
 */
export function evaluateElectricityReduction(
  currentBill: BillPeriodData,
  historicalBills: BillPeriodData[]
): ElectricityChallengeResult {
  const { unitsPerDay: currentUnitsPerDay, days: currentPeriodDays } = computeUnitsPerDay(
    currentBill.units,
    currentBill.periodStart,
    currentBill.periodEnd
  );

  const currentStart = currentBill.periodStart instanceof Date ? currentBill.periodStart : new Date(currentBill.periodStart);

  // 1. Check for bill for the same period last year (~320 to ~410 days before currentStart)
  const lastYearBill = historicalBills.find((b) => {
    if (b.id === currentBill.id) return false;
    const bStart = b.periodStart instanceof Date ? b.periodStart : new Date(b.periodStart);
    const dayDiff = Math.abs((currentStart.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24));
    return dayDiff >= 320 && dayDiff <= 410;
  });

  if (lastYearBill) {
    const { unitsPerDay: baselineUnitsPerDay, days: baselinePeriodDays } = computeUnitsPerDay(
      lastYearBill.units,
      lastYearBill.periodStart,
      lastYearBill.periodEnd
    );

    const reductionPercent = baselineUnitsPerDay > 0
      ? ((baselineUnitsPerDay - currentUnitsPerDay) / baselineUnitsPerDay) * 100
      : 0;

    const achieved = reductionPercent >= 10;

    return {
      eligible: true,
      baselineUnitsPerDay: Math.round(baselineUnitsPerDay * 100) / 100,
      currentUnitsPerDay: Math.round(currentUnitsPerDay * 100) / 100,
      currentPeriodDays,
      baselinePeriodDays,
      reductionPercent: Math.round(reductionPercent * 10) / 10,
      achieved,
      pointsToAward: achieved ? 150 : 0,
      baselineType: 'SAME_PERIOD_LAST_YEAR',
      reason: achieved
        ? `Qualified! You reduced usage by ${reductionPercent.toFixed(1)}% compared to the same billing cycle last year.`
        : `Your usage is ${reductionPercent.toFixed(1)}% vs last year's cycle. 10% reduction required to earn 150 GP.`,
    };
  }

  // 2. Average of last 3 previous bills
  const previousBills = historicalBills
    .filter((b) => {
      if (b.id === currentBill.id) return false;
      const bEnd = b.periodEnd instanceof Date ? b.periodEnd : new Date(b.periodEnd);
      return bEnd.getTime() <= currentStart.getTime();
    })
    .sort((a, b) => {
      const aEnd = a.periodEnd instanceof Date ? a.periodEnd : new Date(a.periodEnd);
      const bEnd = b.periodEnd instanceof Date ? b.periodEnd : new Date(b.periodEnd);
      return bEnd.getTime() - aEnd.getTime();
    });

  if (previousBills.length < 3) {
    return {
      eligible: false,
      baselineUnitsPerDay: 0,
      currentUnitsPerDay: Math.round(currentUnitsPerDay * 100) / 100,
      currentPeriodDays,
      baselinePeriodDays: 0,
      reductionPercent: 0,
      achieved: false,
      pointsToAward: 0,
      baselineType: 'INSUFFICIENT_HISTORY',
      reason: 'Add more bills to join this challenge (minimum 3 previous bills required for baseline).',
    };
  }

  const baseline3Bills = previousBills.slice(0, 3);
  const baselineStats = baseline3Bills.map((b) => computeUnitsPerDay(b.units, b.periodStart, b.periodEnd));
  const avgUnitsPerDay = baselineStats.reduce((sum, s) => sum + s.unitsPerDay, 0) / 3;
  const avgDays = Math.round(baselineStats.reduce((sum, s) => sum + s.days, 0) / 3);

  const reductionPercent = avgUnitsPerDay > 0
    ? ((avgUnitsPerDay - currentUnitsPerDay) / avgUnitsPerDay) * 100
    : 0;

  const achieved = reductionPercent >= 10;

  return {
    eligible: true,
    baselineUnitsPerDay: Math.round(avgUnitsPerDay * 100) / 100,
    currentUnitsPerDay: Math.round(currentUnitsPerDay * 100) / 100,
    currentPeriodDays,
    baselinePeriodDays: avgDays,
    reductionPercent: Math.round(reductionPercent * 10) / 10,
    achieved,
    pointsToAward: achieved ? 150 : 0,
    baselineType: 'THREE_BILL_AVERAGE',
    reason: achieved
      ? `Qualified! You reduced usage by ${reductionPercent.toFixed(1)}% below your 3-bill average baseline.`
      : `Usage reduced by ${reductionPercent.toFixed(1)}% vs your 3-bill baseline. 10% reduction required to earn 150 GP.`,
  };
}
