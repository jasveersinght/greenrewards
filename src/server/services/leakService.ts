/**
 * Leak Service — transactional orchestrator for citizen water leak reporting,
 * geospatial duplicate merging within 50m, reviewer verification, and two-tier bounties.
 */
import { prisma } from '@/server/db'
import {
  isValidLeakCategory,
  isDuplicateCase,
  canReviewLeak,
  parseLeakBounties,
} from '@/server/domain/leaks'
import { buildEntry } from '@/server/domain/wallet'

export interface SubmitLeakParams {
  userId: string
  lat: number
  lng: number
  category: string
  description: string
  photoUrl: string
}

export async function submitLeakReport(params: SubmitLeakParams) {
  const { userId, lat, lng, category, description, photoUrl } = params

  if (!isValidLeakCategory(category)) {
    throw new Error('INVALID_CATEGORY_PUBLIC_ONLY')
  }

  // 1. Fetch active LEAK campaign
  const campaign = await prisma.campaign.findFirst({
    where: {
      section: 'LEAK',
      status: 'ACTIVE',
    },
  })

  const campaignId = campaign?.id ?? 'campaign-leak-1'

  // 2. Check open cases to detect duplicate within 50m
  const openCases = await prisma.leakCase.findMany({
    where: {
      status: { in: ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'NEEDS_INFO'] },
    },
    include: {
      reports: { select: { id: true, userId: true } },
    },
  })

  const duplicateMatch = openCases.find(c =>
    isDuplicateCase(c.lat, c.lng, lat, lng, 50)
  )

  return prisma.$transaction(async tx => {
    if (duplicateMatch) {
      // Duplicate found: link report to existing case
      const report = await tx.leakReport.create({
        data: {
          caseId: duplicateMatch.id,
          userId,
          photoUrl,
          isDuplicate: true,
        },
      })

      await tx.leakEvent.create({
        data: {
          caseId: duplicateMatch.id,
          actorId: userId,
          eventType: 'DUPLICATE_JOINED',
          note: `Secondary report submitted within 50m. Category: ${category}.`,
          evidenceUrl: photoUrl,
        },
      })

      return {
        caseId: duplicateMatch.id,
        reportId: report.id,
        isDuplicate: true,
        message: 'A leak was already reported at this location. Your photo has been joined to the existing case!',
      }
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
    })

    const report = await tx.leakReport.create({
      data: {
        caseId: leakCase.id,
        userId,
        photoUrl,
        isDuplicate: false,
      },
    })

    await tx.leakEvent.create({
      data: {
        caseId: leakCase.id,
        actorId: userId,
        eventType: 'SUBMITTED',
        note: description,
        evidenceUrl: photoUrl,
      },
    })

    return {
      caseId: leakCase.id,
      reportId: report.id,
      isDuplicate: false,
      message: 'New leak case reported successfully! Thank you for protecting Chennai water.',
    }
  })
}

export async function getLeakCases(params?: {
  userId?: string
  status?: string
  category?: string
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
  })
}

export async function getLeakCaseById(caseId: string) {
  const leakCase = await prisma.leakCase.findUnique({
    where: { id: caseId },
    include: {
      reports: {
        include: { user: { select: { id: true, displayName: true, locality: true } } },
        orderBy: { submittedAt: 'asc' },
      },
      events: { orderBy: { createdAt: 'asc' } },
      campaign: { select: { id: true, name: true, rewardRule: true, funder: true } },
    },
  })

  return leakCase
}

export async function reviewLeakCase(params: {
  caseId: string
  reviewerUserId: string
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_INFO'
  reason?: string
}) {
  const { caseId, reviewerUserId, decision, reason } = params

  const leakCase = await prisma.leakCase.findUnique({
    where: { id: caseId },
    include: {
      reports: { orderBy: { submittedAt: 'asc' }, take: 1 },
      campaign: true,
    },
  })

  if (!leakCase) {
    throw new Error('LEAK_CASE_NOT_FOUND')
  }

  const primaryReport = leakCase.reports[0]
  if (!primaryReport) {
    throw new Error('NO_REPORT_FOUND_FOR_CASE')
  }

  // Prevent self-review
  if (!canReviewLeak(reviewerUserId, primaryReport.userId)) {
    throw new Error('SELF_REVIEW_NOT_ALLOWED')
  }

  const bounties = parseLeakBounties(leakCase.campaign?.rewardRule)

  return prisma.$transaction(async tx => {
    // Record Review log
    await tx.review.create({
      data: {
        reviewerId: reviewerUserId,
        refType: 'LeakCase',
        refId: caseId,
        decision,
        reason: reason ?? null,
      },
    })

    if (decision === 'APPROVED') {
      await tx.leakCase.update({
        where: { id: caseId },
        data: { status: 'ACCEPTED' },
      })

      await tx.leakEvent.create({
        data: {
          caseId,
          actorId: reviewerUserId,
          eventType: 'ACCEPTED',
          note: reason ?? 'Leak report reviewed and accepted by authority.',
        },
      })

      // Issue Tier 1 Bounty (₹100) to the primary reporter
      await tx.ledgerEntry.create({
        data: buildEntry({
          userId: primaryReport.userId,
          campaignId: leakCase.campaignId,
          account: 'AVAILABLE',
          type: 'APPROVE_PENDING',
          amountPaise: bounties.acceptedBountyPaise,
          refType: 'LeakCase',
          refId: caseId,
          note: `Tier 1 Bounty: Public water leak report accepted (${leakCase.category})`,
        }),
      })

      await tx.notification.create({
        data: {
          userId: primaryReport.userId,
          title: '🎉 Leak Report Accepted!',
          body: `Your water leak report at ${leakCase.category} was accepted. ₹${(bounties.acceptedBountyPaise / 100).toFixed(0)} credited to your wallet!`,
        },
      })

      return {
        status: 'ACCEPTED',
        bountyAwardedPaise: bounties.acceptedBountyPaise,
        message: 'Report accepted and ₹100 Tier-1 bounty credited to citizen.',
      }
    } else if (decision === 'REJECTED') {
      await tx.leakCase.update({
        where: { id: caseId },
        data: { status: 'REJECTED' },
      })

      await tx.leakEvent.create({
        data: {
          caseId,
          actorId: reviewerUserId,
          eventType: 'REJECTED',
          note: reason ?? 'Report rejected after review.',
        },
      })

      return { status: 'REJECTED', message: 'Report rejected.' }
    } else {
      await tx.leakCase.update({
        where: { id: caseId },
        data: { status: 'NEEDS_INFO' },
      })

      await tx.leakEvent.create({
        data: {
          caseId,
          actorId: reviewerUserId,
          eventType: 'NEEDS_INFO',
          note: reason ?? 'More information or clearer photo needed.',
        },
      })

      return { status: 'NEEDS_INFO', message: 'Case marked as needing more info.' }
    }
  })
}

export async function uploadRepairEvidence(params: {
  caseId: string
  actorUserId: string
  repairPhotoUrl: string
  note?: string
}) {
  const { caseId, actorUserId, repairPhotoUrl, note } = params

  return prisma.$transaction(async tx => {
    await tx.leakCase.update({
      where: { id: caseId },
      data: { status: 'REPAIRED' },
    })

    await tx.leakEvent.create({
      data: {
        caseId,
        actorId: actorUserId,
        eventType: 'REPAIR_UPLOADED',
        evidenceUrl: repairPhotoUrl,
        note: note ?? 'Plumber / maintenance uploaded repair evidence photo.',
      },
    })

    return { success: true, message: 'Repair photo uploaded. Ready for closure verification.' }
  })
}

export async function verifyRepairAndClose(params: {
  caseId: string
  reviewerUserId: string
  note?: string
}) {
  const { caseId, reviewerUserId, note } = params

  const leakCase = await prisma.leakCase.findUnique({
    where: { id: caseId },
    include: {
      reports: { orderBy: { submittedAt: 'asc' }, take: 1 },
      campaign: true,
      events: true,
    },
  })

  if (!leakCase) throw new Error('LEAK_CASE_NOT_FOUND')

  const primaryReport = leakCase.reports[0]
  if (!primaryReport) throw new Error('NO_REPORT_FOUND_FOR_CASE')

  // Check if verified closure was already processed to guarantee idempotency
  const alreadyClosed = leakCase.events.some(e => e.eventType === 'VERIFIED_CLOSED')
  if (alreadyClosed || leakCase.status === 'VERIFIED_CLOSED') {
    return { success: true, message: 'Case is already closed and bonus rewarded.' }
  }

  const bounties = parseLeakBounties(leakCase.campaign?.rewardRule)

  return prisma.$transaction(async tx => {
    await tx.leakCase.update({
      where: { id: caseId },
      data: { status: 'VERIFIED_CLOSED' },
    })

    await tx.leakEvent.create({
      data: {
        caseId,
        actorId: reviewerUserId,
        eventType: 'VERIFIED_CLOSED',
        note: note ?? 'Repair confirmed and verified by reviewer. Case closed.',
      },
    })

    // Issue Tier 2 Bonus (₹150) to primary reporter
    await tx.ledgerEntry.create({
      data: buildEntry({
        userId: primaryReport.userId,
        campaignId: leakCase.campaignId,
        account: 'AVAILABLE',
        type: 'APPROVE_PENDING',
        amountPaise: bounties.verifiedBonusPaise,
        refType: 'LeakCase',
        refId: caseId,
        note: `Tier 2 Bonus: Water leak repair verified and closed`,
      }),
    })

    await tx.notification.create({
      data: {
        userId: primaryReport.userId,
        title: '💧 Leak Repair Verified!',
        body: `The leak you reported has been repaired and verified. ₹${(bounties.verifiedBonusPaise / 100).toFixed(0)} bonus credited to your wallet!`,
      },
    })

    return {
      success: true,
      bonusAwardedPaise: bounties.verifiedBonusPaise,
      message: 'Repair verified and ₹150 Tier-2 bonus credited to citizen.',
    }
  })
}
