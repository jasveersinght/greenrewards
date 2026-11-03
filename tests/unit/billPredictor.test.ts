import { describe, it, expect } from 'vitest';
import { predictHouseholdBill, BillPredictionInput } from '@/server/services/billPredictor';

describe('Household Energy Bill Predictor (ML Service)', () => {
  const baseInput: BillPredictionInput = {
    num_rooms: 2,
    num_people: 4,
    housearea: 750,
    is_ac: true,
    is_tv: true,
    is_flat: true,
    ave_monthly_income: 25000,
    num_children: 1,
    is_urban: true,
    season: 'summer',
  };

  it('predicts realistic bill amounts and kWh for typical Chennai households', () => {
    const res = predictHouseholdBill(baseInput);
    expect(res.predictedBillRupees).toBeGreaterThan(600);
    expect(res.predictedBillRupees).toBeLessThan(1800);
    expect(res.predictedKwh).toBeGreaterThan(100);
    expect(res.predictedKwh).toBeLessThan(350);
  });

  it('reflects higher electricity consumption when Air Conditioning is active', () => {
    const withAc = predictHouseholdBill({ ...baseInput, is_ac: true });
    const withoutAc = predictHouseholdBill({ ...baseInput, is_ac: false });
    expect(withAc.predictedBillRupees).toBeGreaterThan(withoutAc.predictedBillRupees);
    expect(withAc.breakdown.airConditioning).toBeGreaterThan(0);
    expect(withoutAc.breakdown.airConditioning).toBe(0);
  });

  it('scales consumption with larger household floor area and member count', () => {
    const smallApt = predictHouseholdBill({ ...baseInput, housearea: 450, num_people: 2 });
    const largeVilla = predictHouseholdBill({ ...baseInput, housearea: 1600, num_people: 6 });
    expect(largeVilla.predictedBillRupees).toBeGreaterThan(smallApt.predictedBillRupees);
    expect(largeVilla.predictedKwh).toBeGreaterThan(smallApt.predictedKwh);
  });

  it('applies Chennai seasonal adjustments properly', () => {
    const summer = predictHouseholdBill({ ...baseInput, season: 'summer' });
    const winter = predictHouseholdBill({ ...baseInput, season: 'winter' });
    expect(summer.predictedBillRupees).toBeGreaterThan(winter.predictedBillRupees);
    expect(summer.seasonalAdjustment.multiplier).toBe(1.22);
    expect(winter.seasonalAdjustment.multiplier).toBe(0.90);
  });

  it('computes 10% efficiency challenge target and ₹200 Eco bonus', () => {
    const res = predictHouseholdBill(baseInput);
    expect(res.efficiencyChallenge.target10PercentKwh).toBeCloseTo(res.predictedKwh * 0.9, 1);
    expect(res.efficiencyChallenge.greenRewardBonusRupees).toBe(200);
    expect(res.efficiencyChallenge.potentialSavingsRupees).toBeCloseTo(res.predictedBillRupees * 0.1, 1);
  });

  it('generates tailored energy-saving recommendations', () => {
    const res = predictHouseholdBill(baseInput);
    expect(res.recommendations.length).toBeGreaterThanOrEqual(3);
    const hasAcTip = res.recommendations.some(r => r.category === 'Cooling Efficiency');
    expect(hasAcTip).toBe(true);
    const hasEcoChallenge = res.recommendations.some(r => r.category === 'Green Rewards Challenge');
    expect(hasEcoChallenge).toBe(true);
  });
});
