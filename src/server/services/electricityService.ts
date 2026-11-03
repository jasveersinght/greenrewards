import { prisma } from '@/server/db';
import {
  evaluateElectricityReduction,
  BillPeriodData,
  ELECTRICITY_PROVIDER_NAME,
} from '@/server/domain/electricityChallenge';
import { appendDoubleEntry } from './walletService';
import { computeAvailableAt } from '@/server/domain/pointsConfig';

export interface AddBillInput {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  units: number; // in kWh
  amountPaise: number;
  tariffPaisePerUnit?: number;
  source?: string;
  imageUrl?: string;
}

export const electricityService = {
  providerName: ELECTRICITY_PROVIDER_NAME,

  /**
   * Get user's connected energy devices and simulated smart plugs.
   */
  async getUserDevices(userId: string) {
    let devices = await prisma.device.findMany({
      where: { userId },
      include: {
        readings: {
          orderBy: { readingAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (devices.length === 0) {
      const demoPlug = await prisma.device.create({
        data: {
          userId,
          name: 'Living Room AC & Fan Monitor',
          appliance: 'Air Conditioner',
          circuit: 'Main Bed/Living Room',
          deviceType: 'ENERGY_PLUG',
          isSimulated: true,
        },
      });

      await prisma.reading.createMany({
        data: [
          {
            deviceId: demoPlug.id,
            watts: 840,
            kwh: 3.2,
            readingAt: new Date(Date.now() - 3600 * 1000),
            source: 'SIMULATED',
          },
          {
            deviceId: demoPlug.id,
            watts: 620,
            kwh: 2.8,
            readingAt: new Date(),
            source: 'SIMULATED',
          },
        ],
      });

      devices = await prisma.device.findMany({
        where: { userId },
        include: {
          readings: {
            orderBy: { readingAt: 'desc' },
            take: 5,
          },
        },
      });
    }

    return devices;
  },

  /**
   * Register a new device.
   */
  async registerDevice(userId: string, data: { name: string; appliance?: string; circuit?: string; deviceType?: string }) {
    return await prisma.device.create({
      data: {
        userId,
        name: data.name,
        appliance: data.appliance,
        circuit: data.circuit,
        deviceType: data.deviceType || 'ENERGY_PLUG',
        isSimulated: true,
      },
    });
  },

  /**
   * Get historical electricity bills.
   */
  async getBills(userId: string) {
    let bills = await prisma.bill.findMany({
      where: { userId, type: 'ELECTRICITY' },
      orderBy: { periodEnd: 'desc' },
    });

    // If user has no bills yet, seed 4 historical bills (so there's baseline + latest testable bill)
    if (bills.length === 0) {
      const now = new Date();
      // Bimonthly cycles (60 days each)
      const b0End = new Date(now.getFullYear(), now.getMonth(), 0);
      const b0Start = new Date(now.getFullYear(), now.getMonth() - 2, 1);

      const b1End = new Date(b0Start.getTime() - 1 * 24 * 3600 * 1000);
      const b1Start = new Date(b1End.getTime() - 59 * 24 * 3600 * 1000);

      const b2End = new Date(b1Start.getTime() - 1 * 24 * 3600 * 1000);
      const b2Start = new Date(b2End.getTime() - 60 * 24 * 3600 * 1000);

      const b3End = new Date(b2Start.getTime() - 1 * 24 * 3600 * 1000);
      const b3Start = new Date(b3End.getTime() - 59 * 24 * 3600 * 1000);

      await prisma.bill.createMany({
        data: [
          {
            userId,
            type: 'ELECTRICITY',
            periodStart: b3Start,
            periodEnd: b3End,
            units: 520, // ~8.66 units/day
            amountPaise: 270000,
            tariffPaisePerUnit: 520,
            source: 'EXTRACTED',
          },
          {
            userId,
            type: 'ELECTRICITY',
            periodStart: b2Start,
            periodEnd: b2End,
            units: 490, // ~8.16 units/day
            amountPaise: 254800,
            tariffPaisePerUnit: 520,
            source: 'EXTRACTED',
          },
          {
            userId,
            type: 'ELECTRICITY',
            periodStart: b1Start,
            periodEnd: b1End,
            units: 510, // ~8.50 units/day
            amountPaise: 265200,
            tariffPaisePerUnit: 520,
            source: 'EXTRACTED',
          },
          {
            userId,
            type: 'ELECTRICITY',
            periodStart: b0Start,
            periodEnd: b0End,
            units: 440, // ~7.33 units/day (13.7% reduction vs ~8.44 baseline!)
            amountPaise: 228800,
            tariffPaisePerUnit: 520,
            source: 'MANUAL',
          },
        ],
      });

      bills = await prisma.bill.findMany({
        where: { userId, type: 'ELECTRICITY' },
        orderBy: { periodEnd: 'desc' },
      });
    }

    return bills;
  },

  /**
   * Add a new electricity bill.
   */
  async addBill(input: AddBillInput) {
    return await prisma.bill.create({
      data: {
        userId: input.userId,
        type: 'ELECTRICITY',
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        units: input.units,
        amountPaise: input.amountPaise,
        tariffPaisePerUnit: input.tariffPaisePerUnit,
        source: input.source || 'MANUAL',
      },
    });
  },

  /**
   * Evaluate user's energy reduction status vs user's OWN actual baseline.
   */
  async evaluateBaselineStatus(userId: string) {
    const bills = await this.getBills(userId);

    if (bills.length === 0) {
      return {
        hasSufficientHistory: false,
        baselineKwh: 0,
        currentKwh: 0,
        billCount: 0,
        evaluation: null,
        alreadyClaimed: false,
      };
    }

    const [latest, ...historical] = bills;

    const evaluation = evaluateElectricityReduction(
      latest as BillPeriodData,
      historical as BillPeriodData[]
    );

    const alreadyClaimed = await prisma.ledgerEntry.findFirst({
      where: {
        userId,
        refType: 'ENERGY_REDUCTION',
        refId: latest.id,
      },
    });

    return {
      hasSufficientHistory: evaluation.eligible,
      baselineKwh: Math.round(evaluation.baselineUnitsPerDay * evaluation.currentPeriodDays),
      currentKwh: latest.units,
      billCount: bills.length,
      latestBillId: latest.id,
      evaluation,
      alreadyClaimed: Boolean(alreadyClaimed),
      providerName: ELECTRICITY_PROVIDER_NAME,
    };
  },

  /**
   * Claim 150 Green Points reward when 10% reduction challenge is met.
   * Reward is credited to USER_PENDING and awaits reviewer approval.
   */
  async claimReductionReward(userId: string, billId: string) {
    return await prisma.$transaction(async (tx) => {
      const bill = await tx.bill.findUnique({
        where: { id: billId },
      });

      if (!bill || bill.userId !== userId) {
        throw new Error('Bill not found or unauthorized');
      }

      // Check if already claimed
      const existing = await tx.ledgerEntry.findFirst({
        where: {
          userId,
          refType: 'ENERGY_REDUCTION',
          refId: billId,
        },
      });

      if (existing) {
        throw new Error('Reward has already been claimed for this billing period');
      }

      // Re-verify eligibility inside transaction
      const historicalBills = await tx.bill.findMany({
        where: { userId, type: 'ELECTRICITY', id: { not: billId } },
        orderBy: { periodEnd: 'desc' },
      });

      const evaluation = evaluateElectricityReduction(
        bill as BillPeriodData,
        historicalBills as BillPeriodData[]
      );

      if (!evaluation.achieved) {
        throw new Error(evaluation.reason || '10% reduction target was not met');
      }

      const campaign = await tx.campaign.findFirst({
        where: { section: 'ELECTRICITY', status: 'ACTIVE' },
      });

      const availableAt = computeAvailableAt();

      // Double-entry: SPONSOR_POOL -> USER_PENDING (150 Points)
      await appendDoubleEntry(tx, {
        debitAccount: 'SPONSOR_POOL',
        creditAccount: 'USER_PENDING',
        amountPoints: 150,
        userId,
        campaignId: campaign?.id,
        type: 'EARN',
        refType: 'ENERGY_REDUCTION',
        refId: bill.id,
        availableAt,
        note: `TNPDCL 10% Energy Challenge: ${evaluation.reductionPercent}% reduction verified! (150 GP pending review)`,
      });

      return {
        success: true,
        pointsAwarded: 150,
        reductionPercent: evaluation.reductionPercent,
        availableAt,
        message: '150 Green Points credited to pending! Awaiting reviewer approval of utility bills.',
      };
    });
  },
};
