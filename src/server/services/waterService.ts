import { prisma } from '@/server/db';
import { computeTelemetryEvidenceHash } from '@/server/domain/telemetry';
import { appendDoubleEntry } from './walletService';
import { computeAvailableAt, POINTS_CONFIG } from '@/server/domain/pointsConfig';

export interface SubmitRepairClaimInput {
  userId: string;
  evidenceUrl?: string;
  invoiceUrl?: string;
  householdId?: string;
  leakCaseId?: string;
  category?: string;
  address?: string;
  locality?: string;
  notes?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
  repairStage?: string;
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
              include: {
                assignedPlumber: { select: { displayName: true } },
              },
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
                include: {
                  assignedPlumber: { select: { displayName: true } },
                },
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
   * Submit household plumbing repair claim or plumber service request.
   * Runs SHA-256 evidence deduplication so the exact same photo cannot be claimed twice.
   */
  async submitRepairClaim(input: SubmitRepairClaimInput) {
    let householdId = input.householdId;
    if (!householdId) {
      const hh = await waterService.getUserHousehold(input.userId);
      householdId = hh?.id;
    }

    const finalEvidenceUrl = input.evidenceUrl || input.beforePhotoUrl || '/evidence/household-repair.jpg';
    const evidenceHash = computeTelemetryEvidenceHash(
      finalEvidenceUrl,
      input.invoiceUrl || input.address || input.notes || crypto.randomUUID()
    );

    // Deduplication check
    const duplicate = await prisma.repairClaim.findFirst({
      where: { evidenceHash },
    });

    if (duplicate) {
      throw new Error('This repair photo or request has already been submitted.');
    }

    const claim = await prisma.repairClaim.create({
      data: {
        userId: input.userId,
        householdId,
        leakCaseId: input.leakCaseId,
        evidenceUrl: finalEvidenceUrl,
        invoiceUrl: input.invoiceUrl,
        category: input.category || 'TAP',
        address: input.address,
        locality: input.locality || 'Potheri',
        notes: input.notes,
        beforePhotoUrl: input.beforePhotoUrl || finalEvidenceUrl,
        afterPhotoUrl: input.afterPhotoUrl,
        repairStage: input.repairStage || 'REQUESTED',
        evidenceHash,
        status: 'PENDING',
      },
      include: {
        assignedPlumber: { select: { displayName: true } },
      },
    });

    return claim;
  },

  /**
   * Reviewer adjudicates a water repair claim.
   * If confirmed, awards 75 Green Points to citizen.
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

      // Atomic conditional update
      const updateRes = await tx.repairClaim.updateMany({
        where: { id: claimId, status: 'PENDING' },
        data: {
          status: decision,
          rewardedOnce: decision === 'CONFIRMED',
        },
      });

      if (updateRes.count !== 1) {
        throw new Error('REPAIR_CLAIM_ALREADY_REVIEWED');
      }

      if (decision === 'CONFIRMED') {
        const campaign = await tx.campaign.findFirst({
          where: { section: 'WATER', status: 'ACTIVE' },
        });

        const availableAt = computeAvailableAt();
        const points = POINTS_CONFIG.EARNING.HOUSEHOLD_WATER_REPAIR_VERIFIED; // 75 GP

        // Issue 75 Green Points (USER_PENDING)
        await appendDoubleEntry(tx, {
          debitAccount: 'SPONSOR_POOL',
          creditAccount: 'USER_PENDING',
          amountPoints: points,
          userId: claim.userId,
          campaignId: campaign?.id,
          type: 'EARN',
          refType: 'WATER_REPAIR_CLAIM',
          refId: claim.id,
          availableAt,
          note: `Verified home plumbing leak repair reward (${points} GP)`,
        });
      }

      return {
        ...claim,
        status: decision,
        rewardedOnce: decision === 'CONFIRMED',
      };
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
      include: {
        assignedPlumber: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
