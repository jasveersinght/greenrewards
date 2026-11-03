import { prisma } from '@/server/db';
import { computeTelemetryEvidenceHash } from '@/server/domain/telemetry';

export interface SubmitRepairClaimInput {
  userId: string;
  evidenceUrl: string;
  invoiceUrl?: string;
  householdId?: string;
  leakCaseId?: string;
}

export const waterService = {
  /**
   * Get user's household or create default household.
   */
  async getUserHousehold(userId: string) {
    let member = await prisma.householdMember.findFirst({
      where: { userId },
      include: {
        household: {
          include: {
            members: {
              include: {
                user: { select: { id: true, displayName: true, email: true } },
              },
            },
            readings: {
              orderBy: { readingAt: 'desc' },
              take: 7,
            },
            repairClaims: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
    });

    if (!member) {
      // Auto-create default household for user
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const household = await prisma.household.create({
        data: {
          name: `${user?.displayName || 'My'} Apartment`,
          memberCount: 3,
          mode: 'METER',
        },
      });

      member = await prisma.householdMember.create({
        data: {
          householdId: household.id,
          userId,
        },
        include: {
          household: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, displayName: true, email: true } },
                },
              },
              readings: {
                orderBy: { readingAt: 'desc' },
                take: 7,
              },
              repairClaims: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      });

      // Seed baseline daily readings (e.g. 420L, 380L, 360L)
      const now = new Date();
      await prisma.reading.createMany({
        data: [
          {
            householdId: household.id,
            litres: 420,
            readingAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000),
            source: 'METER',
          },
          {
            householdId: household.id,
            litres: 390,
            readingAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000),
            source: 'METER',
          },
          {
            householdId: household.id,
            litres: 350,
            readingAt: now,
            source: 'METER',
          },
        ],
      });
    }

    return member.household;
  },

  /**
   * Log daily water reading for a household.
   */
  async logWaterReading(householdId: string, litres: number, source: string = 'MANUAL') {
    return await prisma.reading.create({
      data: {
        householdId,
        litres,
        readingAt: new Date(),
        source,
      },
    });
  },

  /**
   * Submit household plumbing repair claim.
   * Runs SHA-256 evidence deduplication so the exact same photo cannot be claimed twice.
   */
  async submitRepairClaim(input: SubmitRepairClaimInput) {
    const evidenceHash = computeTelemetryEvidenceHash(input.evidenceUrl, input.invoiceUrl);

    // Deduplication check
    const duplicate = await prisma.repairClaim.findFirst({
      where: { evidenceHash },
    });

    if (duplicate) {
      throw new Error('This repair photo or invoice has already been submitted for a reward.');
    }

    const claim = await prisma.repairClaim.create({
      data: {
        userId: input.userId,
        householdId: input.householdId,
        leakCaseId: input.leakCaseId,
        evidenceUrl: input.evidenceUrl,
        invoiceUrl: input.invoiceUrl,
        evidenceHash,
        status: 'PENDING',
      },
    });

    return claim;
  },

  /**
   * Reviewer adjudicates a water repair claim.
   * If confirmed, awards ₹250 (25000 paise) voucher / wallet reward to citizen.
   */
  async reviewRepairClaim(
    reviewerId: string,
    claimId: string,
    decision: 'CONFIRMED' | 'REJECTED',
    reason?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const claim = await tx.repairClaim.findUnique({
        where: { id: claimId },
      });

      if (!claim) {
        throw new Error('Repair claim not found');
      }

      if (claim.status !== 'PENDING') {
        throw new Error(`Repair claim is already ${claim.status.toLowerCase()}`);
      }

      // Record Review
      await tx.review.create({
        data: {
          reviewerId,
          refType: 'RepairClaim',
          refId: claim.id,
          decision: decision === 'CONFIRMED' ? 'APPROVED' : 'REJECTED',
          reason,
        },
      });

      const updated = await tx.repairClaim.update({
        where: { id: claimId },
        data: {
          status: decision,
          rewardedOnce: decision === 'CONFIRMED',
        },
      });

      if (decision === 'CONFIRMED') {
        // Issue ₹250 (25000 paise) water repair reward
        const campaign = await tx.campaign.findFirst({
          where: { section: 'WATER', status: 'ACTIVE' },
        });

        await tx.ledgerEntry.create({
          data: {
            userId: claim.userId,
            campaignId: campaign?.id,
            account: 'AVAILABLE',
            amountPaise: 25000,
            type: 'EARN_PENDING',
            refType: 'WATER_REPAIR_CLAIM',
            refId: claim.id,
            note: 'Verified home plumbing leak repair reward (₹250 bounty)',
          },
        });
      }

      return updated;
    });
  },

  /**
   * Get all pending water repair claims for reviewer queue.
   */
  async getPendingRepairClaims() {
    return await prisma.repairClaim.findMany({
      where: { status: 'PENDING' },
      include: {
        user: true,
        household: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get user's repair claims.
   */
  async getUserRepairClaims(userId: string) {
    return await prisma.repairClaim.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },
};
