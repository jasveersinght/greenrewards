/**
 * Leak Service — transactional orchestrator for citizen water leak reporting,
 * geospatial duplicate merging within 50m, reviewer verification, and two-tier bounties.
 * Tier 1: 50 points to reporter upon reviewer acceptance.
 * Tier 2: 100 points to the ORIGINAL REPORTER when maintenance repairs are verified closed.
 */
import { prisma } from '@/server/db';
import {
  isValidLeakCategory,
  isDuplicateCase,
  canReviewLeak,
} from '@/server/domain/leaks';
import { appendDoubleEntry } from './walletService';
import { computeAvailableAt, POINTS_CONFIG } from '@/server/domain/pointsConfig';
import { evaluateMonthlyLeakCap } from '@/server/domain/caps';

export interface SubmitLeakParams {
  userId: string;
  lat: number;
  lng: number;
  category: string;
  description: string;
  photoUrl: string;
}

export async function submitLeakReport(params: SubmitLeakParams) {
  const { userId, lat, lng, category, description, photoUrl } = params;

  if (!isValidLeakCategory(category)) {
    throw new Error('INVALID_CATEGORY_PUBLIC_ONLY');
  }

  // 1. Fetch active LEAK campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      section: 'LEAK',
      status: 'ACTIVE',
    },
  });

  const campaignId = campaign?.id ?? 'campaign-leak-1';

  // 2. Check open cases to detect duplicate within 50m
  const openCases = await prisma.leakCase.findMany({
    where: {
      status: { in: ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'NEEDS_INFO'] },
    },
    include: {
      reports: { select: { id: true, userId: true } },
    },
  });

  const duplicateMatch = openCases.find((c) =>
    isDuplicateCase(c.lat, c.lng, lat, lng, 50)
  );

  return prisma.$transaction(async (tx) => {
    if (duplicateMatch) {
      // Duplicate found: link report to existing case (earns 0 Tier 1 points)
      const report = await tx.leakReport.create({
        data: {
          caseId: duplicateMatch.id,
          userId,
          photoUrl,
          isDuplicate: true,
        },
      });

      await tx.leakEvent.create({
        data: {
          caseId: duplicateMatch.id,
          actorId: userId,
          eventType: 'DUPLICATE_JOINED',
          note: `Secondary report submitted within 50m. Joined to existing case. Category: ${category}.`,
          evidenceUrl: photoUrl,
        },
      });

      return {
        caseId: duplicateMatch.id,
        reportId: report.id,
        isDuplicate: true,
        message: 'A leak was already reported within 50m of this location. Your photo has been joined to the existing case.',
      };
    }

    // Fresh case: create LeakCase + initial LeakReport + SUBMITTED event
    const leakCase = await tx.leakCase.create({
      data: {
        campaignId,
        lat,
        lng,
        category,
        description,
        status: 'SUBMITTED',
      },
    });

    const report = await tx.leakReport.create({
      data: {
        caseId: leakCase.id,
        userId,
        photoUrl,
        isDuplicate: false,
      },
    });

    await tx.leakEvent.create({
      data: {
        caseId: leakCase.id,
        actorId: userId,
        eventType: 'SUBMITTED',
        note: `Citizen leak report submitted. Category: ${category}`,
        evidenceUrl: photoUrl,
      },
    });

    return {
      caseId: leakCase.id,
      reportId: report.id,
      isDuplicate: false,
      message: 'Leak report submitted successfully. Awaiting reviewer verification.',
    };
  });
}

export async function getLeakCases(params?: {
  userId?: string;
  status?: string;
  category?: string;
}) {
  return prisma.leakCase.findMany({
    where: {
      status: params?.status ? params.status : undefined,
      category: params?.category ? params.category : undefined,
      reports: params?.userId ? { some: { userId: params.userId } } : undefined,
    },
    include: {
      reports: {
        include: { user: { select: { id: true, displayName: true, locality: true } } },
        orderBy: { submittedAt: 'asc' },
      },
      events: { orderBy: { createdAt: 'desc' } },
      campaign: { select: { id: true, name: true, funder: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getLeakCaseById(caseId: string) {
  return prisma.leakCase.findUnique({
    where: { id: caseId },
    include: {
      reports: {
        include: { user: { select: { id: true, displayName: true, locality: true } } },
        orderBy: { submittedAt: 'asc' },
      },
      events: { orderBy: { createdAt: 'asc' } },
      campaign: { select: { id: true, name: true, funder: true } },
    },
  });
}

export async function reviewLeakCase(params: {
  caseId: string;
  reviewerUserId: string;
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';
  reason?: string;
}) {
  const { caseId, reviewerUserId, decision, reason } = params;

  const leakCase = await prisma.leakCase.findUnique({
    where: { id: caseId },
    include: {
      reports: { orderBy: { submittedAt: 'asc' }, take: 1 },
      campaign: true,
    },
  });

  if (!leakCase) {
    throw new Error('LEAK_CASE_NOT_FOUND');
  }

  const primaryReport = leakCase.reports[0];
  if (!primaryReport) {
    throw new Error('NO_REPORT_FOUND_FOR_CASE');
  }

  // Prevent self-review: reporter can NEVER review their own report
  if (!canReviewLeak(reviewerUserId, primaryReport.userId)) {
    throw new Error('SELF_REVIEW_NOT_ALLOWED');
  }

  return prisma.$transaction(async (tx) => {
    // Record Review log
    await tx.review.create({
      data: {
        reviewerId: reviewerUserId,
        refType: 'LeakCase',
        refId: caseId,
        decision,
        reason: reason ?? null,
      },
    });

    if (decision === 'APPROVED') {
      const updateRes = await tx.leakCase.updateMany({
        where: { id: caseId, status: 'SUBMITTED' },
        data: { status: 'ACCEPTED' },
      });

      if (updateRes.count !== 1) {
        throw new Error('CASE_ALREADY_REVIEWED');
      }

      await tx.leakEvent.create({
        data: {
          caseId,
          actorId: reviewerUserId,
          eventType: 'ACCEPTED',
          note: reason ?? 'Leak report reviewed and accepted by authority.',
        },
      });

      // Check user monthly leak cap (max 3 accepted per user per month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const acceptedThisMonth = await tx.leakCase.count({
        where: {
          reports: { some: { userId: primaryReport.userId, isDuplicate: false } },
          status: { in: ['ACCEPTED', 'ASSIGNED', 'REPAIRED', 'VERIFIED_CLOSED'] },
          updatedAt: { gte: startOfMonth },
        },
      });

      const capCheck = evaluateMonthlyLeakCap(acceptedThisMonth);
      const pointsToAward = capCheck.pointsToAward;
      const availableAt = computeAvailableAt();

      if (pointsToAward > 0) {
        // Issue Tier 1 Bounty (50 Points) to the original reporter
        await appendDoubleEntry(tx, {
          debitAccount: 'SPONSOR_POOL',
          creditAccount: 'USER_PENDING',
          amountPoints: pointsToAward,
          userId: primaryReport.userId,
          campaignId: leakCase.campaignId,
          type: 'EARN',
          refType: 'LeakCase',
          refId: caseId,
          availableAt,
          note: `Tier 1 Bounty: Public water leak report accepted (${leakCase.category})`,
        });
      }

      await tx.notification.create({
        data: {
          userId: primaryReport.userId,
          title: '🎉 Leak Report Accepted!',
          body: `Your water leak report at ${leakCase.category} was accepted. ${pointsToAward} Green Points are pending settlement.`,
        },
      });

      return {
        status: 'ACCEPTED',
        pointsAwarded: pointsToAward,
        message: `Report accepted and ${pointsToAward} Tier-1 points credited to reporter.`,
      };
    } else if (decision === 'REJECTED') {
      await tx.leakCase.updateMany({
        where: { id: caseId, status: 'SUBMITTED' },
        data: { status: 'REJECTED' },
      });

      await tx.leakEvent.create({
        data: {
          caseId,
          actorId: reviewerUserId,
          eventType: 'REJECTED',
          note: reason ?? 'Report rejected after review.',
        },
      });

      return { status: 'REJECTED', message: 'Report rejected.' };
    } else {
      await tx.leakCase.updateMany({
        where: { id: caseId, status: 'SUBMITTED' },
        data: { status: 'NEEDS_INFO' },
      });

      await tx.leakEvent.create({
        data: {
          caseId,
          actorId: reviewerUserId,
          eventType: 'NEEDS_INFO',
          note: reason ?? 'More information or clearer photo needed.',
        },
      });

      return { status: 'NEEDS_INFO', message: 'Case marked as needing more info.' };
    }
  });
}

/**
 * Upload repair evidence (submitted by municipal maintenance or authority team).
 */
export async function uploadRepairEvidence(params: {
  caseId: string;
  actorUserId: string;
  repairPhotoUrl: string;
  note?: string;
}) {
  const { caseId, actorUserId, repairPhotoUrl, note } = params;

  return prisma.$transaction(async (tx) => {
    const updateRes = await tx.leakCase.updateMany({
      where: { id: caseId, status: { in: ['ACCEPTED', 'ASSIGNED'] } },
      data: { status: 'REPAIRED' },
    });

    if (updateRes.count !== 1) {
      throw new Error('CASE_NOT_READY_FOR_REPAIR_EVIDENCE');
    }

    await tx.leakEvent.create({
      data: {
        caseId,
        actorId: actorUserId,
        eventType: 'REPAIR_UPLOADED',
        evidenceUrl: repairPhotoUrl,
        note: note ?? 'Maintenance team uploaded repair evidence photo.',
      },
    });

    return { success: true, message: 'Repair photo uploaded. Awaiting closure verification.' };
  });
}

/**
 * Reviewer verifies that maintenance team completed the repair and closes the case.
 * Tier 2 Points (100 Points) go to the ORIGINAL REPORTER!
 */
export async function verifyRepairAndClose(params: {
  caseId: string;
  reviewerUserId: string;
  note?: string;
}) {
  const { caseId, reviewerUserId, note } = params;

  const leakCase = await prisma.leakCase.findUnique({
    where: { id: caseId },
    include: {
      reports: { orderBy: { submittedAt: 'asc' }, take: 1 },
      campaign: true,
      events: true,
    },
  });

  if (!leakCase) throw new Error('LEAK_CASE_NOT_FOUND');

  const primaryReport = leakCase.reports[0];
  if (!primaryReport) throw new Error('NO_REPORT_FOUND_FOR_CASE');

  // Prevent reporter from verifying their own report closure
  if (primaryReport.userId === reviewerUserId) {
    throw new Error('SELF_VERIFICATION_NOT_ALLOWED: Reporter cannot verify case closure');
  }

  return prisma.$transaction(async (tx) => {
    const updateRes = await tx.leakCase.updateMany({
      where: { id: caseId, status: 'REPAIRED' },
      data: { status: 'VERIFIED_CLOSED' },
    });

    if (updateRes.count !== 1) {
      return { success: true, message: 'Case was already closed.' };
    }

    await tx.leakEvent.create({
      data: {
        caseId,
        actorId: reviewerUserId,
        eventType: 'VERIFIED_CLOSED',
        note: note ?? 'Repair confirmed and verified by reviewer. Case closed.',
      },
    });

    const tier2Points = POINTS_CONFIG.EARNING.LEAK_REPAIR_VERIFIED; // 100 Points
    const availableAt = computeAvailableAt();

    // Issue Tier 2 Bonus (100 Points) to the ORIGINAL REPORTER!
    await appendDoubleEntry(tx, {
      debitAccount: 'SPONSOR_POOL',
      creditAccount: 'USER_PENDING',
      amountPoints: tier2Points,
      userId: primaryReport.userId,
      campaignId: leakCase.campaignId,
      type: 'EARN',
      refType: 'LeakCase',
      refId: caseId,
      availableAt,
      note: `Tier 2 Bonus: Water leak repair verified and closed`,
    });

    await tx.notification.create({
      data: {
        userId: primaryReport.userId,
        title: '💧 Leak Repair Verified!',
        body: `The pipeline leak you reported has been repaired and verified by authority! ${tier2Points} bonus Green Points are pending settlement.`,
      },
    });

    return {
      success: true,
      pointsAwarded: tier2Points,
      message: `Repair verified and ${tier2Points} Tier-2 bonus points credited to original reporter.`,
    };
  });
}
