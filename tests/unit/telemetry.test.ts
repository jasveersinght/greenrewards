import { describe, it, expect } from 'vitest';
import {
  calculateEnergyBaseline,
  evaluateEnergyReduction,
  computeTelemetryEvidenceHash,
  formatPowerReading,
  formatWaterReading,
} from '@/server/domain/telemetry';

describe('Telemetry & Baseline Reduction Domain Logic', () => {
  describe('calculateEnergyBaseline', () => {
    it('returns insufficient history when fewer than 3 billing periods exist', () => {
      const res1 = calculateEnergyBaseline([]);
      expect(res1.hasSufficientHistory).toBe(false);
      expect(res1.baselineKwh).toBe(0);

      const res2 = calculateEnergyBaseline([250, 240]);
      expect(res2.hasSufficientHistory).toBe(false);
      expect(res2.count).toBe(2);
      expect(res2.baselineKwh).toBe(245);
    });

    it('calculates average baseline when 3 or more periods are available', () => {
      const res = calculateEnergyBaseline([220, 240, 260]);
      expect(res.hasSufficientHistory).toBe(true);
      expect(res.count).toBe(3);
      expect(res.baselineKwh).toBe(240);
    });
  });

  describe('evaluateEnergyReduction', () => {
    it('achieves target when reduction is exactly 10%', () => {
      // Baseline 200 kWh, current 180 kWh -> 10% reduction
      const res = evaluateEnergyReduction(200, 180, 10);
      expect(res.reductionPercent).toBe(10);
      expect(res.achieved).toBe(true);
      expect(res.savingsKwh).toBe(20);
    });

    it('achieves target when reduction exceeds 10%', () => {
      // Baseline 250 kWh, current 200 kWh -> 20% reduction
      const res = evaluateEnergyReduction(250, 200, 10);
      expect(res.reductionPercent).toBe(20);
      expect(res.achieved).toBe(true);
      expect(res.savingsKwh).toBe(50);
    });

    it('fails when reduction is less than 10%', () => {
      // Baseline 200 kWh, current 190 kWh -> 5% reduction
      const res = evaluateEnergyReduction(200, 190, 10);
      expect(res.reductionPercent).toBe(5);
      expect(res.achieved).toBe(false);
      expect(res.savingsKwh).toBe(10);
    });

    it('fails when current consumption increased', () => {
      // Baseline 200 kWh, current 220 kWh -> -10% reduction (increase)
      const res = evaluateEnergyReduction(200, 220, 10);
      expect(res.reductionPercent).toBe(-10);
      expect(res.achieved).toBe(false);
      expect(res.savingsKwh).toBe(0);
    });
  });

  describe('computeTelemetryEvidenceHash', () => {
    it('generates consistent SHA-256 hash for repair evidence', () => {
      const h1 = computeTelemetryEvidenceHash('data:image/png;base64,abc', 'invoice-123');
      const h2 = computeTelemetryEvidenceHash('data:image/png;base64,abc', 'invoice-123');
      expect(h1).toBe(h2);
      expect(h1).toHaveLength(64);
    });
  });

  describe('formatting functions', () => {
    it('formats power and kWh correctly', () => {
      expect(formatPowerReading(null, 14.5)).toBe('14.5 kWh');
      expect(formatPowerReading(450, null)).toBe('450 W');
      expect(formatPowerReading(1500, null)).toBe('1.50 kW');
      expect(formatPowerReading(null, null)).toBe('0 W');
    });

    it('formats water volume correctly', () => {
      expect(formatWaterReading(450)).toBe('450 L');
      expect(formatWaterReading(2400)).toBe('2.4 kL');
      expect(formatWaterReading(null)).toBe('0 L');
    });
  });
});
