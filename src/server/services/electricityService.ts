import { prisma } from '@/server/db';
import {
  calculateEnergyBaseline,
  evaluateEnergyReduction,
} from '@/server/domain/telemetry';

export interface AddBillInput {
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  units: number; // in kWh
  amountPaise: number;
  tariffPaisePerUnit?: number;
  source?: string;
}

export const electricityService = {
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

    // Auto-seed demo simulated device if none exist for user
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

      // Add a couple of initial simulated readings
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

    // If user has no bills yet, seed 3 historical bills to demonstrate the baseline calculator!
    if (bills.length === 0) {
      const now = new Date();
      const month3Ago = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const month2Ago = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const month1Ago = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      await prisma.bill.createMany({
        data: [
          {
            userId,
            type: 'ELECTRICITY',
            periodStart: month3Ago,
            periodEnd: new Date(now.getFullYear(), now.getMonth() - 2, 0),
            units: 240, // 240 kWh
            amountPaise: 168000, // ₹1,680
            tariffPaisePerUnit: 700,
            source: 'EXTRACTED',
          },
          {
            userId,
            type: 'ELECTRICITY',
            periodStart: month2Ago,
            periodEnd: new Date(now.getFullYear(), now.getMonth() - 1, 0),
            units: 230, // 230 kWh
            amountPaise: 161000, // ₹1,610
            tariffPaisePerUnit: 700,
            source: 'EXTRACTED',
          },
          {
            userId,
            type: 'ELECTRICITY',
            periodStart: month1Ago,
            periodEnd: new Date(now.getFullYear(), now.getMonth(), 0),
            units: 200, // 200 kWh (15% reduction vs ~235 baseline!)
            amountPaise: 140000, // ₹1,400
            tariffPaisePerUnit: 700,
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
   * Evaluate user's energy reduction status vs baseline.
   */
  async evaluateBaselineStatus(userId: string) {
    const bills = await this.getBills(userId);

    if (bills.length < 2) {
      return {
        hasSufficientHistory: false,
        baselineKwh: 0,
        currentKwh: bills[0]?.units || 0,
        billCount: bills.length,
        evaluation: null,
      };
    }

    // Latest bill is current period, older bills form baseline
    const [latest, ...historical] = bills;
    const historicalUnits = historical.map((b) => b.units);

    // If historical bills count < 2 (total bills < 3), baseline is not fully established per the 3-cycle requirement
    const baseline = calculateEnergyBaseline(historicalUnits, 2);
    const evaluation = evaluateEnergyReduction(baseline.baselineKwh, latest.units, 10);

    // Check if user already claimed reward for the current bill
    const alreadyClaimed = await prisma.ledgerEntry.findFirst({
      where: {
        userId,
        refType: 'ENERGY_REDUCTION',
        refId: latest.id,
      },
    });

    return {
      hasSufficientHistory: baseline.hasSufficientHistory,
      baselineKwh: baseline.baselineKwh,
      currentKwh: latest.units,
      billCount: bills.length,
      latestBillId: latest.id,
      evaluation,
      alreadyClaimed: Boolean(alreadyClaimed),
    };
  },

  /**
   * Claim ₹200 (20000 paise) campaign reward when 10% reduction challenge is met.
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

      // Check campaign
      const campaign = await tx.campaign.findFirst({
        where: { section: 'ELECTRICITY', status: 'ACTIVE' },
      });

      // Credit ₹200 (20000 paise)
      const ledger = await tx.ledgerEntry.create({
        data: {
          userId,
          campaignId: campaign?.id,
          account: 'AVAILABLE',
          amountPaise: 20000,
          type: 'EARN_PENDING',
          refType: 'ENERGY_REDUCTION',
          refId: bill.id,
          note: `Campus Energy Challenge: 10% Electricity reduction verified! (₹200 reward)`,
        },
      });

      return ledger;
    });
  },
};
