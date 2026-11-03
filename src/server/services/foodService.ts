import { prisma } from '@/server/db';
import {
  canReserveStock,
  calculateSavings,
  isListingActiveAndFresh,
  generatePickupCode,
  sanitizeDietTags,
} from '@/server/domain/food';
import { appendDoubleEntry } from './walletService';
import { computeAvailableAt, POINTS_CONFIG } from '@/server/domain/pointsConfig';

export interface CreateListingInput {
  partnerId: string;
  type: 'SALE' | 'DONATION';
  item: string;
  quantity: number;
  originalPricePaise?: number;
  discountedPricePaise?: number;
  pickupStart?: Date;
  pickupEnd?: Date;
  ingredients?: string;
  allergens?: string[];
  preparedAt?: Date;
  consumeBy?: Date;
  handlingNeeds?: string;
  neverServedConfirmed?: boolean;
}

export const foodService = {
  /**
   * List surplus food items with optional filters.
   */
  async listListings(params?: {
    type?: 'SALE' | 'DONATION';
    partnerId?: string;
    activeOnly?: boolean;
  }) {
    const where: any = {};
    if (params?.type) where.type = params.type;
    if (params?.partnerId) where.partnerId = params.partnerId;
    if (params?.activeOnly) {
      where.active = true;
    }

    const items = await prisma.foodListing.findMany({
      where,
      include: {
        partner: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    return items.map((item) => {
      const remaining = Math.max(0, item.quantity - item.reserved);
      const isFresh = isListingActiveAndFresh(item, now);
      const savings = calculateSavings(item.originalPricePaise, item.discountedPricePaise);
      return {
        ...item,
        remaining,
        isFresh,
        savings,
      };
    });
  },

  /**
   * Get listing by ID.
   */
  async getListingById(id: string) {
    const listing = await prisma.foodListing.findUnique({
      where: { id },
      include: {
        partner: true,
        reservations: {
          where: { status: 'ACTIVE' },
        },
      },
    });
    if (!listing) return null;

    const remaining = Math.max(0, listing.quantity - listing.reserved);
    const savings = calculateSavings(listing.originalPricePaise, listing.discountedPricePaise);
    return {
      ...listing,
      remaining,
      savings,
    };
  },

  /**
   * Create a new food surplus listing.
   * If type is DONATION, automatically generates a DonationParcel for NGO pickup / delivery missions.
   */
  async createListing(input: CreateListingInput) {
    const allergensStr = input.allergens ? sanitizeDietTags(input.allergens).join(',') : undefined;

    return await prisma.$transaction(async (tx) => {
      const listing = await tx.foodListing.create({
        data: {
          partnerId: input.partnerId,
          type: input.type,
          item: input.item,
          quantity: input.quantity,
          reserved: 0,
          originalPricePaise: input.originalPricePaise,
          discountedPricePaise: input.discountedPricePaise,
          pickupStart: input.pickupStart,
          pickupEnd: input.pickupEnd,
          ingredients: input.ingredients,
          allergens: allergensStr,
          preparedAt: input.preparedAt,
          consumeBy: input.consumeBy,
          handlingNeeds: input.handlingNeeds,
          neverServedConfirmed: input.neverServedConfirmed ?? true,
          active: true,
        },
      });

      if (input.type === 'DONATION') {
        const parcelCode = `PRCL-${generatePickupCode()}`;
        await tx.donationParcel.create({
          data: {
            listingId: listing.id,
            partnerId: input.partnerId,
            parcelCode,
            quantity: input.quantity,
            status: 'PENDING',
          },
        });
      }

      return listing;
    });
  },

  /**
   * Reserve food quantity using atomic stock decrement.
   */
  async reserveFood(userId: string, listingId: string, quantity: number) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }

    return await prisma.$transaction(async (tx) => {
      const listing = await tx.foodListing.findUnique({
        where: { id: listingId },
        include: { partner: true },
      });

      if (!listing) {
        throw new Error('Food listing not found');
      }

      if (!listing.active) {
        throw new Error('This listing is no longer active');
      }

      if (!canReserveStock(listing.reserved, listing.quantity, quantity)) {
        throw new Error(
          `Insufficient stock available. Requested: ${quantity}, remaining: ${listing.quantity - listing.reserved}`
        );
      }

      // Calculate expiry: 60 minutes from now or pickupEnd, whichever is sooner
      const now = new Date();
      let expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
      if (listing.pickupEnd && listing.pickupEnd.getTime() < expiresAt.getTime()) {
        expiresAt = listing.pickupEnd;
      }

      const pickupCode = generatePickupCode();

      // Update listing reserved count
      await tx.foodListing.update({
        where: { id: listingId },
        data: {
          reserved: { increment: quantity },
        },
      });

      // Create reservation record
      const reservation = await tx.reservation.create({
        data: {
          listingId,
          userId,
          quantity,
          pickupCode,
          status: 'ACTIVE',
          expiresAt,
        },
        include: {
          listing: {
            include: { partner: true },
          },
        },
      });

      return reservation;
    });
  },

  /**
   * Merchant confirms pickup via 4-character pickup code.
   */
  async confirmPickup(merchantPartnerId: string, pickupCode: string) {
    const cleanCode = pickupCode.trim().toUpperCase();

    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { pickupCode: cleanCode },
        include: {
          listing: true,
          user: true,
        },
      });

      if (!reservation) {
        throw new Error('Invalid pickup code');
      }

      if (reservation.listing.partnerId !== merchantPartnerId) {
        throw new Error('Pickup code does not belong to your store');
      }

      if (reservation.status !== 'ACTIVE') {
        throw new Error(`Reservation is already ${reservation.status.toLowerCase()}`);
      }

      const now = new Date();

      // Atomic conditional update to mark confirmed
      const updateRes = await tx.reservation.updateMany({
        where: {
          id: reservation.id,
          status: 'ACTIVE',
          expiresAt: { gt: now },
        },
        data: {
          status: 'CONFIRMED',
          confirmedAt: now,
        },
      });

      if (updateRes.count !== 1) {
        throw new Error('RESERVATION_ALREADY_CONFIRMED_OR_EXPIRED');
      }

      // Credit 15 Green Points reward to citizen wallet (USER_PENDING)
      const availableAt = computeAvailableAt();
      await appendDoubleEntry(tx, {
        debitAccount: 'SPONSOR_POOL',
        creditAccount: 'USER_PENDING',
        amountPoints: POINTS_CONFIG.EARNING.FOOD_PICKUP_COMPLETED,
        userId: reservation.userId,
        type: 'EARN',
        refType: 'FOOD_RESCUE',
        refId: reservation.id,
        availableAt,
        note: `Food Rescue verified pickup: ${reservation.listing.item} (15 GP)`,
      });

      return {
        ...reservation,
        status: 'CONFIRMED',
        confirmedAt: now,
      };
    });
  },

  /**
   * Cancel reservation and return stock back to listing.
   */
  async cancelReservation(userId: string, reservationId: string) {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { listing: true },
      });

      if (!reservation) {
        throw new Error('Reservation not found');
      }

      if (reservation.userId !== userId) {
        throw new Error('Unauthorized');
      }

      if (reservation.status !== 'ACTIVE') {
        throw new Error('Only active reservations can be cancelled');
      }

      // Return stock
      await tx.foodListing.update({
        where: { id: reservation.listingId },
        data: {
          reserved: { decrement: reservation.quantity },
        },
      });

      return await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
      });
    });
  },

  /**
   * Get user's reservations.
   */
  async getUserReservations(userId: string) {
    return await prisma.reservation.findMany({
      where: { userId },
      include: {
        listing: {
          include: { partner: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * List donation parcels with volunteer delivery missions.
   */
  async listDonationParcels() {
    return await prisma.donationParcel.findMany({
      include: {
        partner: true,
        listing: true,
        mission: {
          include: {
            volunteer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Volunteer claims a delivery mission for a donation parcel.
   */
  async claimDeliveryMission(volunteerId: string, parcelId: string) {
    return await prisma.$transaction(async (tx) => {
      const parcel = await tx.donationParcel.findUnique({
        where: { id: parcelId },
        include: { mission: true, listing: true, partner: true },
      });

      if (!parcel) {
        throw new Error('Donation parcel not found');
      }

      if (parcel.mission) {
        throw new Error('This delivery mission has already been claimed');
      }

      if (parcel.status === 'DELIVERED' || parcel.status === 'REJECTED') {
        throw new Error(`Parcel cannot be claimed (status: ${parcel.status})`);
      }

      const mission = await tx.deliveryMission.create({
        data: {
          parcelId,
          volunteerId,
          acceptedAt: new Date(),
        },
      });

      await tx.donationParcel.update({
        where: { id: parcelId },
        data: { status: 'COLLECTED' },
      });

      return mission;
    });
  },

  /**
   * Volunteer completes food delivery mission to NGO shelter.
   * Awards ₹50 (5000 paise) volunteer bounty.
   */
  async completeDeliveryMission(volunteerId: string, missionId: string) {
    return await prisma.$transaction(async (tx) => {
      const mission = await tx.deliveryMission.findUnique({
        where: { id: missionId },
        include: {
          parcel: {
            include: { listing: true, partner: true },
          },
        },
      });

      if (!mission) {
        throw new Error('Delivery mission not found');
      }

      if (mission.volunteerId !== volunteerId) {
        throw new Error('You are not assigned to this mission');
      }

      if (mission.completedAt) {
        throw new Error('Mission is already completed');
      }

      const updatedMission = await tx.deliveryMission.update({
        where: { id: missionId },
        data: { completedAt: new Date() },
      });

      await tx.donationParcel.update({
        where: { id: mission.parcelId },
        data: { status: 'DELIVERED' },
      });

      // Award volunteer bounty ₹50 (5000 paise)
      await tx.ledgerEntry.create({
        data: {
          userId: volunteerId,
          account: 'AVAILABLE',
          amountPaise: 5000,
          type: 'EARN_PENDING',
          refType: 'FOOD_DELIVERY_MISSION',
          refId: mission.id,
          note: `Food Rescue Volunteer Mission completed: ${mission.parcel.listing.item} delivered to NGO (₹50 bounty)`,
        },
      });

      return updatedMission;
    });
  },
};
