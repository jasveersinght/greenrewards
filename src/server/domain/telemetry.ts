import crypto from 'crypto';

export interface BaselineResult {
  baselineKwh: number;
  count: number;
  hasSufficientHistory: boolean;
}

export interface ReductionResult {
  percentChange: number;
  reductionPercent: number;
  achieved: boolean;
  savingsKwh: number;
}

/**
 * Calculates historical baseline energy usage.
 * Requires at least 3 distinct billing periods to establish an accurate seasonal baseline.
 */
export function calculateEnergyBaseline(
  historicalUnits: number[],
  minimumPeriods: number = 3
): BaselineResult {
  if (!historicalUnits || historicalUnits.length < minimumPeriods) {
    const avg = historicalUnits.length > 0
      ? historicalUnits.reduce((a, b) => a + b, 0) / historicalUnits.length
      : 0;
    return {
      baselineKwh: Math.round(avg * 10) / 10,
      count: historicalUnits.length,
      hasSufficientHistory: false,
    };
  }

  const sum = historicalUnits.reduce((a, b) => a + b, 0);
  const baseline = Math.round((sum / historicalUnits.length) * 10) / 10;
  return {
    baselineKwh: baseline,
    count: historicalUnits.length,
    hasSufficientHistory: true,
  };
}

/**
 * Evaluates whether current billing period achieved the required reduction vs baseline.
 * Target default is 10% (0.10).
 */
export function evaluateEnergyReduction(
  baselineKwh: number,
  currentKwh: number,
  targetReductionPercent: number = 10
): ReductionResult {
  if (baselineKwh <= 0) {
    return {
      percentChange: 0,
      reductionPercent: 0,
      achieved: false,
      savingsKwh: 0,
    };
  }

  const diff = baselineKwh - currentKwh;
  const reductionPercent = Math.round((diff / baselineKwh) * 100);
  const percentChange = -reductionPercent; // negative means drop in consumption
  const achieved = reductionPercent >= targetReductionPercent;
  const savingsKwh = Math.max(0, Math.round(diff * 10) / 10);

  return {
    percentChange,
    reductionPercent,
    achieved,
    savingsKwh,
  };
}

/**
 * Computes deterministic hash of plumbing repair evidence photos & invoices for deduplication.
 */
export function computeTelemetryEvidenceHash(evidenceUrl: string, invoiceUrl?: string): string {
  const normalized = `${evidenceUrl.trim()}|${(invoiceUrl || '').trim()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Formats power readings into readable units.
 */
export function formatPowerReading(watts?: number | null, kwh?: number | null): string {
  if (kwh != null) {
    return `${kwh.toFixed(1)} kWh`;
  }
  if (watts != null) {
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(2)} kW`;
    }
    return `${Math.round(watts)} W`;
  }
  return '0 W';
}

/**
 * Formats water volume into human readable metric.
 */
export function formatWaterReading(litres?: number | null): string {
  if (litres == null) return '0 L';
  if (litres >= 1000) {
    return `${(litres / 1000).toFixed(1)} kL`;
  }
  return `${Math.round(litres)} L`;
}
