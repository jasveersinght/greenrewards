import crypto from 'crypto';

export const ALLOWED_COMMUTE_MODES = ['METRO', 'BUS', 'SUBURBAN_TRAIN', 'CYCLE'] as const;
export type CommuteMode = (typeof ALLOWED_COMMUTE_MODES)[number];

export interface CommuteProgress {
  percent: number;
  remaining: number;
  completed: boolean;
}

/**
 * Computes a deterministic SHA-256 hash of ticket data or image content for deduplication.
 */
export function computeTicketHash(imageContent: string, ticketNumber?: string): string {
  const normalized = `${(ticketNumber || '').trim().toUpperCase()}:${imageContent.trim()}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Checks whether user has exceeded the daily submission limit for commute tickets.
 */
export function canSubmitTicketToday(countToday: number, dailyLimit: number): boolean {
  if (dailyLimit <= 0) return false;
  return countToday < dailyLimit;
}

/**
 * Calculates user's progress toward the challenge goal (e.g., 5 trips).
 */
export function calculateCommuteProgress(
  approvedJourneys: number,
  targetJourneys: number
): CommuteProgress {
  const target = Math.max(1, targetJourneys);
  const count = Math.max(0, approvedJourneys);
  const remaining = Math.max(0, target - count);
  const percent = Math.min(100, Math.round((count / target) * 100));
  const completed = count >= target;

  return {
    percent,
    remaining,
    completed,
  };
}

/**
 * Validates that ticket journey date falls within the challenge active window and is not in future.
 */
export function isJourneyDateValid(
  journeyDate: Date,
  challengeStart: Date,
  challengeEnd: Date,
  now: Date = new Date()
): { valid: boolean; reason?: string } {
  const journeyMs = journeyDate.getTime();
  const nowMs = now.getTime() + 24 * 60 * 60 * 1000; // allow up to end of today for timezone leniency

  if (journeyMs > nowMs) {
    return { valid: false, reason: 'Journey date cannot be in the future' };
  }

  if (journeyMs < challengeStart.getTime()) {
    return { valid: false, reason: 'Journey date is before the challenge started' };
  }

  if (journeyMs > challengeEnd.getTime()) {
    return { valid: false, reason: 'Journey date is after the challenge ended' };
  }

  return { valid: true };
}
