/**
 * Domain logic for City Impact metrics and Sponsor reporting.
 * Enforces k-anonymity suppression to protect citizen privacy.
 */

export interface CarbonMetrics {
  stampsAvoidedBags: number;
  mealsRescued: number;
  transitTrips: number;
  kwhSaved: number;
}

/**
 * Enforces k-anonymity privacy protection.
 * If the aggregated count in any demographic or geographical bin is below the threshold (< 5),
 * the exact value is suppressed to prevent individual citizen re-identification.
 */
export function applyKAnonymity(count: number, threshold: number = 5): string | number {
  if (count < threshold) {
    return `< ${threshold}`;
  }
  return count;
}

/**
 * Calculates estimated kilograms of CO2e avoided across sustainability initiatives.
 * Coefficients:
 * - Single-use plastic bag avoided: 0.04 kg CO2e
 * - Rescued meal from waste: 2.50 kg CO2e
 * - Public transit journey vs personal motor vehicle: 1.80 kg CO2e
 * - Electricity saved: 0.82 kg CO2e per kWh (Southern India Grid baseline)
 */
export function calculateCarbonAvoidedKg(metrics: CarbonMetrics): number {
  const bagCo2 = Math.max(0, metrics.stampsAvoidedBags) * 0.04;
  const foodCo2 = Math.max(0, metrics.mealsRescued) * 2.5;
  const transitCo2 = Math.max(0, metrics.transitTrips) * 1.8;
  const energyCo2 = Math.max(0, metrics.kwhSaved) * 0.82;

  const total = bagCo2 + foodCo2 + transitCo2 + energyCo2;
  return Math.round(total * 10) / 10;
}

/**
 * Computes budget utilization for campaign funders and sponsors.
 */
export function calculateBudgetUtilization(totalPaise: number, spentPaise: number): {
  percentSpent: number;
  remainingPaise: number;
} {
  if (totalPaise <= 0) {
    return { percentSpent: 0, remainingPaise: 0 };
  }
  const remaining = Math.max(0, totalPaise - spentPaise);
  const percentSpent = Math.min(100, Math.round((spentPaise / totalPaise) * 100));
  return {
    percentSpent,
    remainingPaise: remaining,
  };
}
