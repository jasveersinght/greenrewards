import { POINTS_CONFIG } from './pointsConfig';

export interface CapEvaluationResult {
  allowed: boolean;
  capped: boolean;
  pointsToAward: number;
  awardedPoints: number;
  reason?: string;
}

export function evaluateMonthlyGlobalCap(
  pointsAlreadyEarnedThisMonth: number,
  pointsRequested: number
): CapEvaluationResult {
  const max = POINTS_CONFIG.CAPS.GLOBAL_MAX_EARNED_POINTS_PER_USER_PER_MONTH;
  if (pointsAlreadyEarnedThisMonth >= max) {
    return {
      allowed: false,
      capped: true,
      pointsToAward: 0,
      awardedPoints: 0,
      reason: `Monthly limit of ${max} Green Points reached. Action recorded with 0 points.`,
    };
  }
  const remaining = max - pointsAlreadyEarnedThisMonth;
  const pointsToAward = Math.min(pointsRequested, remaining);
  const capped = pointsToAward < pointsRequested;
  return {
    allowed: true,
    capped,
    pointsToAward,
    awardedPoints: pointsToAward,
    reason: capped
      ? `Partially capped: earned ${pointsToAward} of ${pointsRequested} points due to monthly limit of ${max} GP.`
      : undefined,
  };
}

export const evaluateGlobalMonthlyCap = evaluateMonthlyGlobalCap;

export function evaluateDailyReuseCap(stampsTodayAtShop: number, pointsRequested = POINTS_CONFIG.EARNING.REUSE_STAMP): CapEvaluationResult {
  const max = POINTS_CONFIG.CAPS.REUSE_STAMPS_PER_SHOP_PER_DAY;
  if (stampsTodayAtShop >= max) {
    return {
      allowed: false,
      capped: true,
      pointsToAward: 0,
      awardedPoints: 0,
      reason: `Daily limit of ${max} stamps per shop reached. Action recorded with 0 points.`,
    };
  }
  return {
    allowed: true,
    capped: false,
    pointsToAward: pointsRequested,
    awardedPoints: pointsRequested,
  };
}

export function evaluateMonthlyLeakCap(acceptedReportsThisMonth: number, pointsRequested = POINTS_CONFIG.EARNING.LEAK_REPORT_ACCEPTED): CapEvaluationResult {
  const max = POINTS_CONFIG.CAPS.LEAK_REPORTS_ACCEPTED_PER_USER_PER_MONTH;
  if (acceptedReportsThisMonth >= max) {
    return {
      allowed: false,
      capped: true,
      pointsToAward: 0,
      awardedPoints: 0,
      reason: `Monthly limit of ${max} accepted leak reports reached. Report recorded with 0 points.`,
    };
  }
  return {
    allowed: true,
    capped: false,
    pointsToAward: pointsRequested,
    awardedPoints: pointsRequested,
  };
}

export function evaluateDailyTransitCap(tripsToday: number, pointsRequested = POINTS_CONFIG.EARNING.TRANSIT_TRIP_REVIEWED): CapEvaluationResult {
  const max = POINTS_CONFIG.CAPS.TRANSIT_TRIPS_PER_USER_PER_DAY;
  if (tripsToday >= max) {
    return {
      allowed: false,
      capped: true,
      pointsToAward: 0,
      awardedPoints: 0,
      reason: `Daily limit of ${max} transit trips reached. Trip recorded with 0 points.`,
    };
  }
  return {
    allowed: true,
    capped: false,
    pointsToAward: pointsRequested,
    awardedPoints: pointsRequested,
  };
}
