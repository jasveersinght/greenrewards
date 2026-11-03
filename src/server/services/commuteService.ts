import { prisma } from '@/server/db';
import {
  computeTicketHash,
  canSubmitTicketToday,
  calculateCommuteProgress,
  isJourneyDateValid,
} from '@/server/domain/commute';
import { appendDoubleEntry } from './walletService';
import { computeAvailableAt, POINTS_CONFIG } from '@/server/domain/pointsConfig';
import { evaluateDailyTransitCap } from '@/server/domain/caps';

export interface SubmitTicketInput {
  challengeId: string;
  ticketId: string;
  journeyDate: Date;
  imageUrl: string;
}

export const commuteService = {
  /**
   * List all commute challenges.
   */
  async getChallenges() {
    const challenges = await prisma.commuteChallenge.findMany({
      include: {
        campaign: true,
        _count: {
          select: { tickets: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    return challenges.map((c) => ({
      ...c,
      modes: JSON.parse(c.modes || '[]'),
    }));
  },

  /**
   * Get single challenge details with user progress.
   */
  async getChallengeWithUserProgress(challengeId: string, userId?: string) {
    const challenge = await prisma.commuteChallenge.findUnique({
      where: { id: challengeId },
      include: {
        campaign: true,
        _count: { select: { tickets: true } },
      },
    });

    if (!challenge) return null;

    let userSubmissions: any[] = [];
    let approvedCount = 0;

    if (userId) {
      userSubmissions = await prisma.ticketSubmission.findMany({
        where: { challengeId, userId },
        orderBy: { createdAt: 'desc' },
      });
      approvedCount = userSubmissions.filter((s) => s.status === 'APPROVED').length;
    }

    const progress = calculateCommuteProgress(approvedCount, challenge.targetJourneys);

    return {
      ...challenge,
      modes: JSON.parse(challenge.modes || '[]'),
      userSubmissions,
      approvedCount,
      progress,
    };
  },

  /**
   * Submit ticket for review.
   * Enforces perceptual/content SHA-256 hash deduplication and daily limits.
   */
  async submitTicket(userId: string, input: SubmitTicketInput) {
    const challenge = await prisma.commuteChallenge.findUnique({
      where: { id: input.challengeId },
    });

    if (!challenge) {
      throw new Error('Commute challenge not found');
    }

    // Validate journey date
    const dateCheck = isJourneyDateValid(
      input.journeyDate,
      challenge.startsAt,
      challenge.endsAt
    );
    if (!dateCheck.valid) {
      throw new Error(dateCheck.reason || 'Invalid journey date');
    }

    // Hash deduplication
    const imageHash = computeTicketHash(input.imageUrl, input.ticketId);

    const duplicate = await prisma.ticketSubmission.findFirst({
      where: {
        OR: [
          { imageHash },
          { ticketId: input.ticketId, challengeId: input.challengeId },
        ],
      },
    });

    if (duplicate) {
      throw new Error('This ticket or image has already been submitted to this challenge.');
    }

    // Check daily limit for user
    const startOfDay = new Date(input.journeyDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(input.journeyDate);
    endOfDay.setHours(23, 59, 59, 999);

    const submissionsToday = await prisma.ticketSubmission.count({
      where: {
        userId,
        challengeId: input.challengeId,
        journeyDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: { not: 'REJECTED' },
      },
    });

    if (!canSubmitTicketToday(submissionsToday, challenge.dailyLimit)) {
      throw new Error(
        `Daily submission limit reached. Maximum ${challenge.dailyLimit} journey per day can be submitted.`
      );
    }

    const submission = await prisma.ticketSubmission.create({
      data: {
        challengeId: input.challengeId,
        userId,
        ticketId: input.ticketId.trim().toUpperCase(),
        journeyDate: input.journeyDate,
        imageUrl: input.imageUrl,
        imageHash,
        status: 'SUBMITTED',
      },
    });

    return submission;
  },

  /**
   * Reviewer adjudicates a commute ticket submission.
   * If approving causes user to hit target journeys (e.g. 5 trips), awards ₹100 wallet reward.
   */
  async reviewTicket(
    reviewerId: string,
    submissionId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const submission = await tx.ticketSubmission.findUnique({
        where: { id: submissionId },
        include: { challenge: true },
      });

      if (!submission) {
        throw new Error('Ticket submission not found');
      }

      if (submission.status !== 'SUBMITTED') {
        throw new Error(`Ticket is already ${submission.status.toLowerCase()}`);
      }

      // Record review log
      const review = await tx.review.create({
        data: {
          reviewerId,
          refType: 'TicketSubmission',
          refId: submission.id,
          decision,
          reason,
        },
      });

      // Atomic update submission status
      const updateRes = await tx.ticketSubmission.updateMany({
        where: { id: submissionId, status: 'SUBMITTED' },
        data: {
          status: decision,
          reviewId: review.id,
        },
      });

      if (updateRes.count !== 1) {
        throw new Error('TICKET_ALREADY_ADJUDICATED');
      }

      // If approved, award per-trip points and check if milestone reached
      if (decision === 'APPROVED') {
        const availableAt = computeAvailableAt();

        // 1. Award 5 points per verified trip (check daily cap)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const approvedToday = await tx.ticketSubmission.count({
          where: {
            userId: submission.userId,
            status: 'APPROVED',
            createdAt: { gte: startOfDay },
          },
        });

        const tripCap = evaluateDailyTransitCap(approvedToday - 1);
        if (tripCap.allowed) {
          await appendDoubleEntry(tx, {
            debitAccount: 'SPONSOR_POOL',
            creditAccount: 'USER_PENDING',
            amountPoints: POINTS_CONFIG.EARNING.TRANSIT_TRIP_REVIEWED,
            userId: submission.userId,
            type: 'EARN',
            refType: 'TicketSubmission',
            refId: submission.id,
            availableAt,
            note: `Transit trip verified: ${submission.ticketId} (+5 GP)`,
          });
        }

        // 2. Check 5-trip streak milestone
        const approvedCount = await tx.ticketSubmission.count({
          where: {
            challengeId: submission.challengeId,
            userId: submission.userId,
            status: 'APPROVED',
          },
        });

        if (approvedCount >= submission.challenge.targetJourneys) {
          // Check if streak reward was already issued
          const existingReward = await tx.ledgerEntry.findFirst({
            where: {
              userId: submission.userId,
              refType: 'COMMUTE_CHALLENGE',
              refId: submission.challengeId,
            },
          });

          if (!existingReward) {
            // Issue milestone streak bonus (25 Points)
            await appendDoubleEntry(tx, {
              debitAccount: 'SPONSOR_POOL',
              creditAccount: 'USER_PENDING',
              amountPoints: POINTS_CONFIG.EARNING.TRANSIT_STREAK_BONUS,
              userId: submission.userId,
              campaignId: submission.challenge.campaignId,
              type: 'EARN',
              refType: 'COMMUTE_CHALLENGE',
              refId: submission.challengeId,
              availableAt,
              note: `Green Commute 5-Trip Streak Bonus (+25 GP)`,
            });
          }
        }
      }

      return {
        ...submission,
        status: decision,
        reviewId: review.id,
      };
    });
  },

  /**
   * List tickets pending review.
   */
  async getPendingReviewTickets() {
    return await prisma.ticketSubmission.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        user: true,
        challenge: {
          include: { campaign: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get all tickets for a user.
   */
  async getUserTickets(userId: string) {
    return await prisma.ticketSubmission.findMany({
      where: { userId },
      include: {
        challenge: {
          include: { campaign: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
