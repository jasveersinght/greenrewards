import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/server/db';
import { createClaim, confirmClaim, getClaimDetails } from '@/server/services/claimService';
import { waterService } from '@/server/services/waterService';
import { foodService } from '@/server/services/foodService';

describe('Cross-Portal Workflows & Manual Verification', () => {
  let testUser: any;
  let shopkeeperUser: any;
  let plumberUser: any;
  let reviewerUser: any;
  let partnerShop: any;
  let partnerPlumber: any;
  let partnerFood: any;
  let offerReuse: any;

  beforeAll(async () => {
    // Setup test partners
    partnerShop = await prisma.partner.upsert({
      where: { id: 'partner-test-shop' },
      create: {
        id: 'partner-test-shop',
        name: 'Test Grocery Mart',
        type: 'SHOP',
        approved: true,
        isSimulated: true,
        address: '12 Test Road, Potheri',
        locality: 'Potheri',
      },
      update: {},
    });

    partnerPlumber = await prisma.partner.upsert({
      where: { id: 'partner-test-plumber' },
      create: {
        id: 'partner-test-plumber',
        name: 'Test Plumbing Express',
        type: 'PLUMBER',
        approved: true,
        isSimulated: true,
        serviceArea: 'Potheri, Kattankulathur',
      },
      update: {},
    });

    partnerFood = await prisma.partner.upsert({
      where: { id: 'partner-test-food' },
      create: {
        id: 'partner-test-food',
        name: 'Test Community Kitchen',
        type: 'MERCHANT',
        approved: true,
        isSimulated: true,
        locality: 'Potheri',
      },
      update: {},
    });

    // Setup test users
    testUser = await prisma.user.upsert({
      where: { email: 'crossportal.citizen@test.com' },
      create: {
        email: 'crossportal.citizen@test.com',
        displayName: 'Test Citizen',
        locality: 'Potheri',
      },
      update: {},
    });

    shopkeeperUser = await prisma.user.upsert({
      where: { email: 'crossportal.shopkeeper@test.com' },
      create: {
        email: 'crossportal.shopkeeper@test.com',
        displayName: 'Test Shopkeeper',
        locality: 'Potheri',
      },
      update: {},
    });

    plumberUser = await prisma.user.upsert({
      where: { email: 'crossportal.plumber@test.com' },
      create: {
        email: 'crossportal.plumber@test.com',
        displayName: 'Test Plumber Tech',
        locality: 'Potheri',
      },
      update: {},
    });

    reviewerUser = await prisma.user.upsert({
      where: { email: 'crossportal.reviewer@test.com' },
      create: {
        email: 'crossportal.reviewer@test.com',
        displayName: 'Test Reviewer',
        locality: 'Potheri',
      },
      update: {},
    });

    // Helper for granting roles
    async function grantTestRole(userId: string, role: string, partnerId?: string) {
      const existing = await prisma.roleGrant.findFirst({
        where: { userId, role, partnerId: partnerId ?? null },
      });
      if (!existing) {
        await prisma.roleGrant.create({
          data: { userId, role, partnerId: partnerId ?? null, grantedBy: 'test' },
        });
      }
    }

    await grantTestRole(shopkeeperUser.id, 'SHOPKEEPER', partnerShop.id);
    await grantTestRole(plumberUser.id, 'PLUMBER', partnerPlumber.id);
    await grantTestRole(reviewerUser.id, 'REVIEWER');

    // Reuse campaign from seed or fallback
    let campaign = await prisma.campaign.findFirst({
      where: { section: 'REUSE', status: 'ACTIVE' },
    });

    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: {
          id: 'campaign-test-reuse',
          name: 'Test Reuse Campaign',
          section: 'REUSE',
          funderPartnerId: partnerShop.id,
          status: 'ACTIVE',
          startsAt: new Date(Date.now() - 86400000),
          endsAt: new Date(Date.now() + 86400000 * 30),
          rewardRule: JSON.stringify({ perStampPoints: 10, bonusPoints: 40 }),
          limits: JSON.stringify({ perUserPerDay: 2 }),
          description: 'Test Campaign',
        },
      });
    }

    offerReuse = await prisma.offer.upsert({
      where: { id: 'offer-test-reuse' },
      create: {
        id: 'offer-test-reuse',
        name: 'Test Reusable Bag Stamp',
        description: 'Bring a reusable bag to earn stamps',
        rewardText: '10 pts per stamp',
        conditions: 'One stamp per day per customer',
        campaignId: campaign.id,
        partnerId: partnerShop.id,
        stampsNeeded: 5,
        voucherValuePaise: 0,
        active: true,
      },
      update: {},
    });
  });

  afterAll(async () => {
    // Clean up created records if needed
  });

  describe('Workflow 1: Citizen Claim -> Shopkeeper Manual Verification', () => {
    it('allows Shopkeeper to look up and confirm a stamp claim via the 6-character code', async () => {
      const freshCitizen = await prisma.user.create({
        data: {
          email: `claim.citizen.${Date.now()}@test.com`,
          displayName: 'Fresh Citizen',
          locality: 'Potheri',
        },
      });

      // 1. Citizen generates claim
      const claimResult = await createClaim(freshCitizen.id, offerReuse.id);
      expect(claimResult.claim.code).toBeDefined();
      expect(claimResult.claim.code).toHaveLength(6);

      const code = claimResult.claim.code;

      // 2. Shopkeeper counter lookup using the 6-character alphanumeric code
      const lookupResult = await getClaimDetails(code, partnerShop.id);
      expect(lookupResult.found).toBe(true);
      if (lookupResult.found) {
        expect(lookupResult.claim.code).toBe(code);
        expect(lookupResult.validation.valid).toBe(true);
      }

      // 3. Shopkeeper confirms the claim using the manual code
      const confirmRes = await confirmClaim({
        opaqueIdOrCode: code,
        merchantUserId: shopkeeperUser.id,
        receiptRef: 'BILL-MANUAL-101',
      });

      expect(confirmRes.success).toBe(true);
      expect(confirmRes.pointsAwarded).toBe(10);

      // 4. Verify claim status is updated in the database
      const updatedClaim = await prisma.claim.findUnique({
        where: { id: claimResult.claim.id },
      });
      expect(updatedClaim?.status).toBe('CONFIRMED');
      expect(updatedClaim?.receiptRef).toBe('BILL-MANUAL-101');
    });

    it('handles QR payload JSON strings pasted into the manual code field', async () => {
      const freshCitizen2 = await prisma.user.create({
        data: {
          email: `qr.citizen.${Date.now()}@test.com`,
          displayName: 'Fresh Citizen 2',
          locality: 'Potheri',
        },
      });

      const claimResult = await createClaim(freshCitizen2.id, offerReuse.id);
      const rawJson = JSON.stringify({ opaqueId: claimResult.claim.opaqueId, code: claimResult.claim.code });

      const lookup = await getClaimDetails(rawJson, partnerShop.id);
      expect(lookup.found).toBe(true);
    });
  });

  describe('Workflow 2: Water Leak Request -> Plumber Acceptance -> Reviewer Closure', () => {
    it('creates a requested repair job, assigns a plumber on accept, and awards 75 GP upon reviewer confirmation', async () => {
      const uniqueSuffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      // 1. Citizen requests a certified plumber visit
      const requestClaim = await waterService.submitRepairClaim({
        userId: testUser.id,
        category: 'TAP',
        locality: 'Potheri',
        address: `Flat 101, SRM Lakeview, Potheri ${uniqueSuffix}`,
        notes: `Dripping bathroom tap wasting potable water ${uniqueSuffix}`,
        evidenceUrl: `https://test.example.com/tap-${uniqueSuffix}.jpg`,
        repairStage: 'REQUESTED',
      });

      expect(requestClaim.id).toBeDefined();
      expect(requestClaim.repairStage).toBe('REQUESTED');
      expect(requestClaim.status).toBe('PENDING');

      // 2. Plumber queries available jobs
      const available = await prisma.repairClaim.findMany({
        where: {
          status: 'PENDING',
          repairStage: 'REQUESTED',
          plumberPartnerId: null,
          id: requestClaim.id,
        },
      });
      expect(available).toHaveLength(1);

      // 3. Plumber accepts the job
      const accepted = await prisma.repairClaim.update({
        where: { id: requestClaim.id },
        data: {
          repairStage: 'ACCEPTED',
          plumberPartnerId: partnerPlumber.id,
          assignedPlumberId: plumberUser.id,
        },
      });
      expect(accepted.repairStage).toBe('ACCEPTED');
      expect(accepted.assignedPlumberId).toBe(plumberUser.id);

      // 4. Plumber finishes the repair and marks as REPAIRED
      const completed = await prisma.repairClaim.update({
        where: { id: requestClaim.id },
        data: {
          repairStage: 'REPAIRED',
          notes: 'Replaced brass spindle and seal. No leakage.',
        },
      });
      expect(completed.repairStage).toBe('REPAIRED');

      // 5. Reviewer verifies the repair claim
      const reviewResult = await waterService.reviewRepairClaim(
        reviewerUser.id,
        requestClaim.id,
        'CONFIRMED',
        'Plumbing repair verified.'
      );

      expect(reviewResult.status).toBe('CONFIRMED');

      // 6. Verify citizen was awarded 75 GP
      const entry = await prisma.ledgerEntry.findFirst({
        where: {
          userId: testUser.id,
          refType: 'WATER_REPAIR_CLAIM',
          refId: requestClaim.id,
        },
      });
      expect(entry).toBeDefined();
      expect(entry?.amountPoints).toBe(75);
    });
  });

  describe('Workflow 3: Food Rescue Reservation & Manual Pickup Verification', () => {
    it('allows Shopkeeper or Admin to confirm food pickup with 4-character pickup code', async () => {
      // Create listing
      const listing = await prisma.foodListing.create({
        data: {
          partnerId: partnerFood.id,
          type: 'SALE',
          item: 'Surplus Fresh Sandwiches',
          quantity: 5,
          reserved: 0,
          originalPricePaise: 12000,
          discountedPricePaise: 4000,
          pickupStart: new Date(Date.now() - 3600000),
          pickupEnd: new Date(Date.now() + 3600000),
          active: true,
        },
      });

      // Citizen reserves listing
      const reservation = await foodService.reserveFood(testUser.id, listing.id, 1);
      expect(reservation.pickupCode).toHaveLength(4);

      // Shopkeeper verifies using 4-character pickup code
      const confirmed = await foodService.confirmPickup(
        partnerFood.id,
        reservation.pickupCode,
        false
      );

      expect(confirmed.status).toBe('CONFIRMED');

      // Check points awarded (15 GP for Food Rescue)
      const ledgerEntry = await prisma.ledgerEntry.findFirst({
        where: {
          userId: testUser.id,
          refType: 'FOOD_RESCUE',
          refId: reservation.id,
        },
      });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry?.amountPoints).toBe(15);
    });
  });

  describe('Workflow 4: Citizen Application -> Admin Approval -> Role Grant', () => {
    it('creates role application, allows admin to approve, and verifies role is granted', async () => {
      // Citizen applies for PLUMBER role
      const application = await prisma.roleApplication.create({
        data: {
          userId: testUser.id,
          role: 'PLUMBER',
          organizationName: 'Priya Quick Plumbing Services',
          locality: 'Potheri',
          phone: '9876543210',
          description: 'Certified licensed residential plumbing service technician in SRM area',
          serviceArea: 'Potheri, Kattankulathur',
          status: 'PENDING',
        },
      });

      expect(application.status).toBe('PENDING');

      // Admin approves
      const partner = await prisma.partner.create({
        data: {
          name: application.organizationName,
          type: 'PLUMBER',
          locality: application.locality,
          phone: application.phone,
          serviceArea: application.serviceArea,
          approved: true,
          isSimulated: true,
        },
      });

      await prisma.roleGrant.create({
        data: {
          userId: testUser.id,
          role: 'PLUMBER',
          partnerId: partner.id,
          grantedBy: 'admin-test',
        },
      });

      const updatedApp = await prisma.roleApplication.update({
        where: { id: application.id },
        data: { status: 'APPROVED' },
      });
      expect(updatedApp.status).toBe('APPROVED');

      // Verify the user now has the granted role
      const grants = await prisma.roleGrant.findMany({
        where: { userId: testUser.id, revokedAt: null },
      });
      const grantedRoles = grants.map((g) => g.role);
      expect(grantedRoles).toContain('PLUMBER');
    });
  });
});
