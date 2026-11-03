import { describe, it, expect } from 'vitest';
import {
  computeTicketHash,
  canSubmitTicketToday,
  calculateCommuteProgress,
  isJourneyDateValid,
} from '@/server/domain/commute';

describe('Green Commute Domain Logic', () => {
  describe('computeTicketHash', () => {
    it('produces a deterministic SHA-256 hex string', () => {
      const hash1 = computeTicketHash('base64image-sample', 'TKT-12345');
      const hash2 = computeTicketHash('base64image-sample', 'TKT-12345');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('normalizes ticket number casing and whitespace', () => {
      const hash1 = computeTicketHash('image-data', '  tkt-12345  ');
      const hash2 = computeTicketHash('image-data', 'TKT-12345');
      expect(hash1).toBe(hash2);
    });

    it('produces different hash for different images or ticket numbers', () => {
      const hash1 = computeTicketHash('image-A', 'TKT-1');
      const hash2 = computeTicketHash('image-B', 'TKT-1');
      const hash3 = computeTicketHash('image-A', 'TKT-2');
      expect(hash1).not.toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('canSubmitTicketToday', () => {
    it('allows submission when today count is strictly less than daily limit', () => {
      expect(canSubmitTicketToday(0, 1)).toBe(true);
      expect(canSubmitTicketToday(1, 2)).toBe(true);
    });

    it('blocks submission when daily limit reached or exceeded', () => {
      expect(canSubmitTicketToday(1, 1)).toBe(false);
      expect(canSubmitTicketToday(2, 1)).toBe(false);
      expect(canSubmitTicketToday(0, 0)).toBe(false);
    });
  });

  describe('calculateCommuteProgress', () => {
    it('calculates completion status and percentage', () => {
      const p1 = calculateCommuteProgress(2, 5);
      expect(p1.percent).toBe(40);
      expect(p1.remaining).toBe(3);
      expect(p1.completed).toBe(false);

      const p2 = calculateCommuteProgress(5, 5);
      expect(p2.percent).toBe(100);
      expect(p2.remaining).toBe(0);
      expect(p2.completed).toBe(true);

      const p3 = calculateCommuteProgress(6, 5);
      expect(p3.percent).toBe(100);
      expect(p3.remaining).toBe(0);
      expect(p3.completed).toBe(true);
    });
  });

  describe('isJourneyDateValid', () => {
    const start = new Date('2026-11-01T00:00:00Z');
    const end = new Date('2026-11-30T23:59:59Z');
    const now = new Date('2026-11-15T12:00:00Z');

    it('accepts date within active challenge range', () => {
      const check = isJourneyDateValid(new Date('2026-11-10T10:00:00Z'), start, end, now);
      expect(check.valid).toBe(true);
    });

    it('rejects journey date prior to challenge start', () => {
      const check = isJourneyDateValid(new Date('2026-10-25T10:00:00Z'), start, end, now);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('before the challenge started');
    });

    it('rejects journey date in future relative to current time', () => {
      const check = isJourneyDateValid(new Date('2026-11-25T10:00:00Z'), start, end, now);
      expect(check.valid).toBe(false);
      expect(check.reason).toContain('future');
    });
  });
});
