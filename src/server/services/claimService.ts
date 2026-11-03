/**
 * Claim Service — transactional orchestrator for QR claims, merchant verification,
 * stamp increments, voucher generation, and merchant milestone tracking.
 */
import { prisma } from '@/server/db'
import {
  generateClaimCode,
  claimExpiryDate,
  validateClaimForConfirmation,
} from '@/server/domain/claims'
import {
  calculateStampProgress,
  checkDailyLimit,
  shouldFlagMerchantForAudit,
} from '@/server/domain/rewards'
import { buildEntry } from '@/server/domain/wallet'

export interface CreateClaimResult {
  claim: {
    id: string
    opaqueId: string
    code: string
    expiresAt: Date
    status: string
  }
  offer: {
    id: string
    name: string
    partnerName: string
    stampsNeeded: number
    voucherValuePaise: number
  }
  currentStamps: number
  qrPayload: string
}

export async function createClaim(userId: string, offerId: string): Promise<CreateClaimResult> {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: {
      partner: { select: { id: true, name: true } },
      campaign: { select: { id: true, status: true, limits: true } },
    },
  })

  if (!offer || !offer.active) {
    throw new Error('OFFER_NOT_FOUND_OR_INACTIVE')
  }

  if (offer.campaign.status !== 'ACTIVE') {
    throw new Error('CAMPAIGN_NOT_ACTIVE')
  }

  // Check if user has already confirmed a claim today
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const confirmedTodayCount = await prisma.claim.count({
    where: {
      userId,
      offerId,
      status: 'CONFIRMED',
      usedAt: { gte: startOfDay },
    },
  })

  if (!checkDailyLimit(confirmedTodayCount, 1)) {
    throw new Error('DAILY_LIMIT_REACHED')
  }

  // Check for an existing unexpired pending claim to avoid duplicate creation
  const existingPending = await prisma.claim.findFirst({
    where: {
      userId,
      offerId,
      status: 'PENDING',
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Get current user stamps for this offer
  const stampCard = await prisma.stampCard.findUnique({
    where: { userId_offerId: { userId, offerId } },
  })
  const currentStamps = stampCard?.stamps ?? 0

  if (existingPending) {
    const qrPayload = JSON.stringify({
      opaqueId: existingPending.opaqueId,
      code: existingPending.code,
    })
    return {
      claim: {
        id: existingPending.id,
        opaqueId: existingPending.opaqueId,
        code: existingPending.code,
        expiresAt: existingPending.expiresAt,
        status: existingPending.status,
      },
      offer: {
        id: offer.id,
        name: offer.name,
        partnerName: offer.partner.name,
        stampsNeeded: offer.stampsNeeded,
        voucherValuePaise: offer.voucherValuePaise,
      },
      currentStamps,
      qrPayload,
    }
  }

  // Create fresh claim
  const opaqueId = crypto.randomUUID()
  const code = generateClaimCode()
  const expiresAt = claimExpiryDate(120)

  const claim = await prisma.claim.create({
    data: {
      opaqueId,
      code,
      userId,
      offerId,
      expiresAt,
      status: 'PENDING',
    },
  })

  const qrPayload = JSON.stringify({
    opaqueId: claim.opaqueId,
    code: claim.code,
  })

  return {
    claim: {
      id: claim.id,
      opaqueId: claim.opaqueId,
      code: claim.code,
      expiresAt: claim.expiresAt,
      status: claim.status,
    },
    offer: {
      id: offer.id,
      name: offer.name,
      partnerName: offer.partner.name,
      stampsNeeded: offer.stampsNeeded,
      voucherValuePaise: offer.voucherValuePaise,
    },
    currentStamps,
    qrPayload,
  }
}

export async function getClaimDetails(opaqueIdOrCode: string, merchantPartnerId?: string | null) {
  const normalized = opaqueIdOrCode.trim()
  const claim = await prisma.claim.findFirst({
    where: {
      OR: [
        { opaqueId: normalized },
        { code: normalized.toUpperCase() },
      ],
    },
    include: {
      offer: {
        include: {
          partner: true,
          campaign: true,
        },
      },
      user: {
        select: {
          id: true,
          displayName: true,
          locality: true,
        },
      },
    },
  })

  if (!claim) {
    return { found: false, error: 'CLAIM_NOT_FOUND' } as const
  }

  const validation = validateClaimForConfirmation({
    status: claim.status,
    expiresAt: claim.expiresAt,
    offerPartnerId: claim.offer.partnerId,
    merchantPartnerId,
  })

  // Get current stamp card
  const stampCard = await prisma.stampCard.findUnique({
    where: { userId_offerId: { userId: claim.userId, offerId: claim.offerId } },
  })

  return {
    found: true,
    claim: {
      id: claim.id,
      opaqueId: claim.opaqueId,
      code: claim.code,
      status: claim.status,
      expiresAt: claim.expiresAt,
      usedAt: claim.usedAt,
      receiptRef: claim.receiptRef,
      createdAt: claim.createdAt,
    },
    user: {
      displayName: claim.user.displayName ?? 'Customer',
      locality: claim.user.locality ?? 'Chennai',
    },
    offer: {
      id: claim.offer.id,
      name: claim.offer.name,
      partnerId: claim.offer.partnerId,
      partnerName: claim.offer.partner.name,
      stampsNeeded: claim.offer.stampsNeeded,
      voucherValuePaise: claim.offer.voucherValuePaise,
    },
    currentStamps: stampCard?.stamps ?? 0,
    validation,
  } as const
}

export interface ConfirmClaimResult {
  success: boolean
  error?: string
  stampsNow?: number
  voucherIssued?: boolean
  voucherValuePaise?: number
  message?: string
}

export async function confirmClaim(params: {
  opaqueIdOrCode: string
  merchantUserId: string
  receiptRef?: string
}): Promise<ConfirmClaimResult> {
  const { opaqueIdOrCode, merchantUserId, receiptRef } = params

  // 1. Resolve merchant partner scope
  const roleGrant = await prisma.roleGrant.findFirst({
    where: {
      userId: merchantUserId,
      role: { in: ['MERCHANT', 'ADMIN'] },
    },
  })

  if (!roleGrant) {
    return { success: false, error: 'NOT_AUTHORIZED_AS_MERCHANT' }
  }

  const merchantPartnerId = roleGrant.role === 'ADMIN' ? null : roleGrant.partnerId

  // 2. Perform confirmation in an atomic transaction
  return prisma.$transaction(async tx => {
    const normalized = opaqueIdOrCode.trim()
    const claim = await tx.claim.findFirst({
      where: {
        OR: [
          { opaqueId: normalized },
          { code: normalized.toUpperCase() },
        ],
      },
      include: {
        offer: {
          include: {
            partner: true,
            campaign: true,
          },
        },
        user: { select: { id: true, displayName: true } },
      },
    })

    if (!claim) {
      return { success: false, error: 'CLAIM_NOT_FOUND' }
    }

    const validation = validateClaimForConfirmation({
      status: claim.status,
      expiresAt: claim.expiresAt,
      offerPartnerId: claim.offer.partnerId,
      merchantPartnerId,
    })

    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // Double check daily limit in transaction
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const confirmedToday = await tx.claim.count({
      where: {
        userId: claim.userId,
        offerId: claim.offerId,
        status: 'CONFIRMED',
        usedAt: { gte: startOfDay },
      },
    })

    if (!checkDailyLimit(confirmedToday, 1)) {
      return { success: false, error: 'DAILY_LIMIT_REACHED' }
    }

    // Mark claim confirmed
    const confirmedAt = new Date()
    await tx.claim.update({
      where: { id: claim.id },
      data: {
        status: 'CONFIRMED',
        usedAt: confirmedAt,
        receiptRef: receiptRef ?? null,
      },
    })

    // Fetch or create user StampCard
    let stampCard = await tx.stampCard.findUnique({
      where: { userId_offerId: { userId: claim.userId, offerId: claim.offerId } },
    })

    if (!stampCard) {
      stampCard = await tx.stampCard.create({
        data: {
          userId: claim.userId,
          offerId: claim.offerId,
          stamps: 0,
        },
      })
    }

    const progress = calculateStampProgress(
      stampCard.stamps,
      1,
      claim.offer.stampsNeeded
    )

    // Update stamp card
    await tx.stampCard.update({
      where: { id: stampCard.id },
      data: {
        stamps: progress.nextStamps,
        completedAt: progress.isCompleted ? confirmedAt : stampCard.completedAt,
      },
    })

    // Create STAMPS ledger entry
    await tx.ledgerEntry.create({
      data: buildEntry({
        userId: claim.userId,
        campaignId: claim.offer.campaignId,
        account: 'STAMPS',
        type: 'EARN_STAMP',
        stamps: 1,
        refType: 'Claim',
        refId: claim.id,
        note: `Stamp earned at ${claim.offer.partner.name}${receiptRef ? ` (Receipt: ${receiptRef})` : ''}`,
      }),
    })

    let voucherIssued = false
    let voucherValuePaise = 0

    // If milestone completed: issue Voucher + AVAILABLE ledger credit + notification
    if (progress.isCompleted) {
      voucherIssued = true
      voucherValuePaise = claim.offer.voucherValuePaise

      const voucherExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      const voucher = await tx.voucher.create({
        data: {
          userId: claim.userId,
          campaignId: claim.offer.campaignId,
          partnerId: claim.offer.partnerId,
          valuePaise: voucherValuePaise,
          expiresAt: voucherExpiry,
        },
      })

      // Add voucher credit ledger entry
      await tx.ledgerEntry.create({
        data: buildEntry({
          userId: claim.userId,
          campaignId: claim.offer.campaignId,
          account: 'AVAILABLE',
          type: 'APPROVE_PENDING',
          amountPaise: voucherValuePaise,
          refType: 'Voucher',
          refId: voucher.id,
          note: `Completed ${claim.offer.stampsNeeded} stamps at ${claim.offer.partner.name}! Voucher awarded.`,
        }),
      })

      // Completion notification
      await tx.notification.create({
        data: {
          userId: claim.userId,
          title: `🎉 ₹${(voucherValuePaise / 100).toFixed(0)} Voucher Earned!`,
          body: `You completed your stamp card at ${claim.offer.partner.name}! Your voucher is ready in your wallet.`,
        },
      })
    } else {
      // Regular stamp notification
      await tx.notification.create({
        data: {
          userId: claim.userId,
          title: `✅ Stamp earned at ${claim.offer.partner.name}!`,
          body: `Reusable bag confirmed. Progress: ${progress.nextStamps}/${claim.offer.stampsNeeded} stamps.`,
        },
      })
    }

    // Increment merchant milestone
    const milestone = await tx.merchantMilestone.upsert({
      where: {
        partnerId_campaignId: {
          partnerId: claim.offer.partnerId,
          campaignId: claim.offer.campaignId,
        },
      },
      create: {
        partnerId: claim.offer.partnerId,
        campaignId: claim.offer.campaignId,
        count: 1,
      },
      update: {
        count: { increment: 1 },
      },
    })

    if (shouldFlagMerchantForAudit(milestone.count, 1)) {
      await tx.merchantMilestone.update({
        where: { id: milestone.id },
        data: { flaggedForAudit: true },
      })
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        actorId: merchantUserId,
        action: 'CLAIM_CONFIRMED',
        refType: 'Claim',
        refId: claim.id,
        meta: JSON.stringify({
          userId: claim.userId,
          offerId: claim.offerId,
          receiptRef,
          voucherIssued,
        }),
      },
    })

    return {
      success: true,
      stampsNow: progress.nextStamps,
      voucherIssued,
      voucherValuePaise,
      message: voucherIssued
        ? `Stamp confirmed! Completed card — ₹${(voucherValuePaise / 100).toFixed(0)} Voucher awarded to customer!`
        : `Stamp confirmed! Customer now has ${progress.nextStamps}/${claim.offer.stampsNeeded} stamps.`,
    }
  })
}

export async function getUserStampCards(userId: string) {
  const cards = await prisma.stampCard.findMany({
    where: { userId },
    include: {
      offer: {
        include: {
          partner: { select: { id: true, name: true, isSimulated: true } },
          campaign: { select: { id: true, name: true, status: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return cards
}
