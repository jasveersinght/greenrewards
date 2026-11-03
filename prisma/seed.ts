/**
 * Prisma Seed Script — Green Rewards
 * City: Chennai, near SRM IST Kattankulathur
 * All funders/authorities labelled isSimulated: true.
 * OTPs are printed to console when send-otp is called in dev.
 *
 * Run: npx prisma db seed
 */
import { prisma } from '../src/server/db'
import bcrypt from 'bcryptjs'

// Helper: create user + ensure USER role grant
async function createUser(email: string, displayName: string, city = 'Chennai', locality = 'Kattankulathur') {
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, displayName, city, locality },
    update: { displayName, city, locality },
  })
  await grantRole(user.id, 'USER', undefined, 'seed')
  return user
}

async function grantRole(userId: string, role: string, partnerId?: string, grantedBy = 'seed') {
  const existing = await prisma.roleGrant.findFirst({
    where: { userId, role, partnerId: partnerId ?? null },
  })
  if (!existing) {
    await prisma.roleGrant.create({
      data: { userId, role, partnerId: partnerId ?? null, grantedBy },
    })
  }
}

async function main() {
  console.log('🌱 Seeding Green Rewards database...')

  // ──────────────────────────────────────────────────────────────
  // 1. LOCATIONS (~10 near SRM IST Kattankulathur)
  // ──────────────────────────────────────────────────────────────
  const locationData = [
    { lat: 12.8231, lng: 80.0444, address: 'SRM IST Main Gate, Kattankulathur', isPublic: true },
    { lat: 12.8189, lng: 80.0478, address: 'Potheri Bus Stand, Potheri', isPublic: true },
    { lat: 12.8451, lng: 80.0582, address: 'Guduvancheri Railway Station', isPublic: true },
    { lat: 12.8215, lng: 80.0461, address: 'FreshMart Grocery, Potheri High Road', isPublic: true },
    { lat: 12.8201, lng: 80.0449, address: 'Annapoorna Kitchen, Potheri', isPublic: true },
    { lat: 12.7953, lng: 80.0271, address: 'GreenHands NGO Collection Centre, Maraimalai Nagar', isPublic: true },
    { lat: 12.8244, lng: 80.0431, address: 'SRM Tech Park, Kattankulathur', isPublic: true },
    { lat: 12.8312, lng: 80.0612, address: 'Kalavakkam Park', isPublic: true },
    { lat: 12.8275, lng: 80.0521, address: 'GST Road, Kattankulathur', isPublic: true },
    { lat: 12.8502, lng: 80.0643, address: 'Singaperumal Koil Railway Station', isPublic: true },
  ]

  const locations = await Promise.all(
    locationData.map((l: typeof locationData[0]) => prisma.location.create({ data: l }))
  )
  console.log(`  ✅ Created ${locations.length} locations`)

  // ──────────────────────────────────────────────────────────────
  // 2. PARTNERS
  // ──────────────────────────────────────────────────────────────
  const ecoBrand = await prisma.partner.upsert({
    where: { id: 'partner-ecobrand' },
    create: { id: 'partner-ecobrand', name: 'EcoBrand (Simulated)', type: 'SPONSOR', approved: true, isSimulated: true },
    update: {},
  })

  const freshMart = await prisma.partner.upsert({
    where: { id: 'partner-freshmart' },
    create: { id: 'partner-freshmart', name: 'FreshMart Grocery', type: 'SHOP', approved: true, isSimulated: false, locationId: locations[3].id },
    update: {},
  })

  const annapoorna = await prisma.partner.upsert({
    where: { id: 'partner-annapoorna' },
    create: { id: 'partner-annapoorna', name: 'Annapoorna Kitchen', type: 'RESTAURANT', approved: true, isSimulated: false, locationId: locations[4].id },
    update: {},
  })

  const greenHands = await prisma.partner.upsert({
    where: { id: 'partner-greenhands' },
    create: { id: 'partner-greenhands', name: 'GreenHands NGO (Simulated)', type: 'FOOD_PARTNER', approved: true, isSimulated: true, locationId: locations[5].id },
    update: {},
  })

  const metroWater = await prisma.partner.upsert({
    where: { id: 'partner-metrowater' },
    create: { id: 'partner-metrowater', name: 'Chennai Metro Water (Simulated)', type: 'AUTHORITY', approved: true, isSimulated: true },
    update: {},
  })

  const srmEcoCell = await prisma.partner.upsert({
    where: { id: 'partner-srmeco' },
    create: { id: 'partner-srmeco', name: 'SRM EcoCell (Simulated)', type: 'AUTHORITY', approved: true, isSimulated: true },
    update: {},
  })

  const chenMetroRail = await prisma.partner.upsert({
    where: { id: 'partner-chennairail' },
    create: { id: 'partner-chennairail', name: 'Chennai Metro Rail (Simulated)', type: 'OPERATOR', approved: true, isSimulated: true },
    update: {},
  })

  console.log('  ✅ Created partners')

  // ──────────────────────────────────────────────────────────────
  // 3. USERS
  // ──────────────────────────────────────────────────────────────
  const userDemo = await createUser('user@demo', 'Priya Kumar', 'Chennai', 'Kattankulathur')
  const user2Demo = await createUser('user2@demo', 'Arjun Sharma', 'Chennai', 'Potheri')
  const merchantDemo = await createUser('merchant@demo', 'Ravi Merchant', 'Chennai', 'Potheri')
  const restaurantDemo = await createUser('restaurant@demo', 'Meena Restaurant', 'Chennai', 'Potheri')
  const reviewerDemo = await createUser('reviewer@demo', 'Kavitha Reviewer', 'Chennai', 'Guduvancheri')
  const maintenanceDemo = await createUser('maintenance@demo', 'Suresh Maintenance', 'Chennai', 'Kattankulathur')
  const foodPartnerDemo = await createUser('foodpartner@demo', 'GreenHands Coordinator', 'Chennai', 'Maraimalai Nagar')
  const sponsorDemo = await createUser('sponsor@demo', 'EcoBrand Manager', 'Chennai', 'Kattankulathur')
  const adminDemo = await createUser('admin@demo', 'Admin User', 'Chennai', 'Kattankulathur')

  // Grant roles
  await grantRole(merchantDemo.id, 'MERCHANT', freshMart.id, adminDemo.id)
  await grantRole(restaurantDemo.id, 'MERCHANT', annapoorna.id, adminDemo.id)
  await grantRole(reviewerDemo.id, 'REVIEWER', undefined, adminDemo.id)
  await grantRole(maintenanceDemo.id, 'MAINTENANCE', undefined, adminDemo.id)
  await grantRole(foodPartnerDemo.id, 'FOOD_PARTNER', greenHands.id, adminDemo.id)
  await grantRole(sponsorDemo.id, 'SPONSOR', ecoBrand.id, adminDemo.id)
  await grantRole(adminDemo.id, 'ADMIN', undefined, 'seed')

  console.log('  ✅ Created users + role grants')

  // ──────────────────────────────────────────────────────────────
  // 4. CAMPAIGNS (one per section + one COMING_SOON)
  // ──────────────────────────────────────────────────────────────
  const now = new Date('2026-10-24T00:00:00+05:30')
  const in60days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
  const in90days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const in30days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // REUSE — ACTIVE
  const reuseCampaign = await prisma.campaign.upsert({
    where: { id: 'campaign-reuse-1' },
    create: {
      id: 'campaign-reuse-1',
      name: 'Reusable Bag Month — October',
      section: 'REUSE',
      funderPartnerId: ecoBrand.id,
      status: 'ACTIVE',
      startsAt: now,
      endsAt: in60days,
      description: 'Bring a reusable bag to FreshMart. Earn 1 stamp per visit. 5 stamps = ₹50 voucher.',
      evidenceNeeded: 'Merchant scans your QR at checkout to confirm reusable bag use.',
      rewardRule: JSON.stringify({ type: 'STAMP_CARD', stampsNeeded: 5, voucherValuePaise: 5000, perUserPerDay: 1 }),
      limits: JSON.stringify({ perUserPerDay: 1, perUserTotal: 50, totalSlots: 5000 }),
      isSimulated: false,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: reuseCampaign.id },
    create: { campaignId: reuseCampaign.id, totalPaise: 1000000 }, // ₹10,000
    update: {},
  })

  // Create offer for the reuse campaign
  await prisma.offer.upsert({
    where: { id: 'offer-freshmart-reuse' },
    create: {
      id: 'offer-freshmart-reuse',
      partnerId: freshMart.id,
      campaignId: reuseCampaign.id,
      name: 'FreshMart Reusable Bag Stamp',
      description: 'Use a reusable bag at FreshMart checkout. Earn 1 stamp. 5 stamps = ₹50 voucher.',
      rewardText: '1 stamp per confirmed purchase with reusable bag',
      conditions: 'One stamp per day per customer. Reusable item must be used at checkout.',
      stampsNeeded: 5,
      voucherValuePaise: 5000,
    },
    update: {},
  })

  // LEAK — ACTIVE
  const leakCampaign = await prisma.campaign.upsert({
    where: { id: 'campaign-leak-1' },
    create: {
      id: 'campaign-leak-1',
      name: 'Potheri Leak Hunt — Oct/Nov',
      section: 'LEAK',
      funderPartnerId: metroWater.id,
      status: 'ACTIVE',
      startsAt: now,
      endsAt: in60days,
      description: 'Report public water leaks in Potheri, Kattankulathur and Guduvancheri. Earn a bounty for accepted reports and a bonus when repaired.',
      evidenceNeeded: 'Photo of the leak + map pin. Public locations only (roads, stations, parks).',
      rewardRule: JSON.stringify({ acceptedBountyPaise: 10000, verifiedBonusPaise: 15000 }),
      limits: JSON.stringify({ perUserPerDay: 3, perUserTotal: 30, totalSlots: 500 }),
      isSimulated: true,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: leakCampaign.id },
    create: { campaignId: leakCampaign.id, totalPaise: 500000 }, // ₹5,000
    update: {},
  })

  // FOOD — ACTIVE
  const foodCampaign = await prisma.campaign.upsert({
    where: { id: 'campaign-food-1' },
    create: {
      id: 'campaign-food-1',
      name: 'Surplus Saver — October',
      section: 'FOOD',
      funderPartnerId: ecoBrand.id,
      status: 'ACTIVE',
      startsAt: now,
      endsAt: in30days,
      description: 'Reserve and pick up surplus food from Annapoorna Kitchen at a discount. Optional ₹30 cashback from EcoBrand.',
      evidenceNeeded: 'Confirm pickup code at counter.',
      rewardRule: JSON.stringify({ cashbackPaise: 3000 }),
      limits: JSON.stringify({ perUserPerDay: 2, perUserTotal: 20, totalSlots: 1000 }),
      isSimulated: false,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: foodCampaign.id },
    create: { campaignId: foodCampaign.id, totalPaise: 800000 }, // ₹8,000
    update: {},
  })

  // ELECTRICITY — ACTIVE
  const electricityCampaign = await prisma.campaign.upsert({
    where: { id: 'campaign-elec-1' },
    create: {
      id: 'campaign-elec-1',
      name: 'Campus Energy Challenge — Nov',
      section: 'ELECTRICITY',
      funderPartnerId: srmEcoCell.id,
      status: 'ACTIVE',
      startsAt: now,
      endsAt: in60days,
      description: 'Reduce your electricity consumption by 10% vs your baseline. Earn ₹200 on admin review.',
      evidenceNeeded: 'Three billing periods of data required. Measured via device or bill entry.',
      rewardRule: JSON.stringify({ reductionPercent: 10, rewardPaise: 20000 }),
      limits: JSON.stringify({ perUserPerDay: 1, perUserTotal: 1, totalSlots: 300 }),
      isSimulated: true,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: electricityCampaign.id },
    create: { campaignId: electricityCampaign.id, totalPaise: 600000 }, // ₹6,000
    update: {},
  })

  // WATER — ACTIVE
  const waterCampaign = await prisma.campaign.upsert({
    where: { id: 'campaign-water-1' },
    create: {
      id: 'campaign-water-1',
      name: 'Home Repair Reward — Ongoing',
      section: 'WATER',
      funderPartnerId: metroWater.id,
      status: 'ACTIVE',
      startsAt: now,
      endsAt: in90days,
      description: 'Get a ₹250 voucher after a household plumbing repair is confirmed by a reviewer.',
      evidenceNeeded: 'Upload repair evidence photo and optional plumber invoice. Reviewer verifies.',
      rewardRule: JSON.stringify({ repairVoucherPaise: 25000 }),
      limits: JSON.stringify({ perUserPerDay: 1, perUserTotal: 3, totalSlots: 200 }),
      isSimulated: true,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: waterCampaign.id },
    create: { campaignId: waterCampaign.id, totalPaise: 400000 }, // ₹4,000
    update: {},
  })

  // COMMUTE — COMING SOON
  const commuteCampaign = await prisma.campaign.upsert({
    where: { id: 'campaign-commute-1' },
    create: {
      id: 'campaign-commute-1',
      name: 'Green Commute November',
      section: 'COMMUTE',
      funderPartnerId: chenMetroRail.id,
      status: 'COMING_SOON',
      startsAt: new Date('2026-11-01T00:00:00+05:30'),
      endsAt: new Date('2026-11-30T23:59:59+05:30'),
      description: 'Take 5 metro or bus journeys in November. Submit your tickets for review. Earn ₹100.',
      evidenceNeeded: 'Upload ticket image with journey date and ticket number. One per day, max 5.',
      rewardRule: JSON.stringify({ targetJourneys: 5, rewardPaise: 10000, dailyLimit: 1 }),
      limits: JSON.stringify({ perUserPerDay: 1, perUserTotal: 5, totalSlots: 1200 }),
      isSimulated: true,
    },
    update: {},
  })
  await prisma.budget.upsert({
    where: { campaignId: commuteCampaign.id },
    create: { campaignId: commuteCampaign.id, totalPaise: 1200000 }, // ₹12,000
    update: {},
  })

  console.log('  ✅ Created campaigns + budgets (1 per section + 1 Coming Soon)')

  // ──────────────────────────────────────────────────────────────
  // 5. SEED LEDGER ENTRIES (demo wallet data)
  // ──────────────────────────────────────────────────────────────
  await prisma.ledgerEntry.createMany({
    data: [
      {
        userId: userDemo.id,
        campaignId: reuseCampaign.id,
        account: 'STAMPS',
        stamps: 3,
        amountPaise: null,
        type: 'EARN_STAMP',
        refType: 'Claim',
        refId: 'seed-claim-1',
        note: 'Stamp 1 — FreshMart reusable bag (seed)',
      },
      {
        userId: userDemo.id,
        campaignId: reuseCampaign.id,
        account: 'STAMPS',
        stamps: 1,
        amountPaise: null,
        type: 'EARN_STAMP',
        refType: 'Claim',
        refId: 'seed-claim-2',
        note: 'Stamp 2 — FreshMart reusable bag (seed)',
      },
      {
        userId: userDemo.id,
        campaignId: leakCampaign.id,
        account: 'PENDING',
        stamps: null,
        amountPaise: 10000,
        type: 'EARN_PENDING',
        refType: 'LeakCase',
        refId: 'seed-leak-1',
        note: 'Accepted leak report bounty (seed)',
      },
      {
        userId: user2Demo.id,
        campaignId: foodCampaign.id,
        account: 'AVAILABLE',
        stamps: null,
        amountPaise: 3000,
        type: 'APPROVE_PENDING',
        refType: 'Reservation',
        refId: 'seed-res-1',
        note: 'Food pickup cashback approved (seed)',
      },
    ],
  })

  console.log('  ✅ Created seed ledger entries')

  // ──────────────────────────────────────────────────────────────
  // 6. SEED NOTIFICATIONS
  // ──────────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: userDemo.id,
        title: '✅ Stamp earned at FreshMart!',
        body: 'Reusable-bag purchase confirmed. Progress: 3/5 stamps.',
      },
      {
        userId: userDemo.id,
        title: '💧 Leak report accepted',
        body: 'Your leak report near Potheri Bus Stand has been accepted. ₹100 is pending.',
      },
    ],
  })

  console.log('  ✅ Created seed notifications')

  // ──────────────────────────────────────────────────────────────
  // 7. COMMUTE CHALLENGE (for Phase 6 seed)
  // ──────────────────────────────────────────────────────────────
  await prisma.commuteChallenge.upsert({
    where: { id: 'challenge-commute-nov' },
    create: {
      id: 'challenge-commute-nov',
      campaignId: commuteCampaign.id,
      modes: JSON.stringify(['METRO', 'BUS']),
      targetJourneys: 5,
      dailyLimit: 1,
      remainingSlots: 1200,
      startsAt: new Date('2026-11-01T00:00:00+05:30'),
      endsAt: new Date('2026-11-30T23:59:59+05:30'),
      rewardValuePaise: 10000,
    },
    update: {},
  })

  // ──────────────────────────────────────────────────────────────
  // 8. FOOD RESCUE LISTINGS & PARCELS (Phase 5 Seed)
  // ──────────────────────────────────────────────────────────────
  const food1 = await prisma.foodListing.upsert({
    where: { id: 'food-thali-box' },
    create: {
      id: 'food-thali-box',
      partnerId: annapoorna.id,
      type: 'SALE',
      item: 'South Indian Veg Meal Box',
      quantity: 8,
      reserved: 2,
      originalPricePaise: 12000,
      discountedPricePaise: 4900,
      pickupStart: new Date(Date.now() - 30 * 60 * 1000),
      pickupEnd: new Date(Date.now() + 4 * 60 * 60 * 1000),
      ingredients: 'Rice, Sambar, Rasam, Poriyal, Appalam, Curd',
      allergens: 'DAIRY_FREE,VEG',
      consumeBy: new Date(Date.now() + 6 * 60 * 60 * 1000),
      handlingNeeds: 'Keep warm or reheat before consuming',
      neverServedConfirmed: true,
      active: true,
    },
    update: {},
  })

  const food2 = await prisma.foodListing.upsert({
    where: { id: 'food-bakery-bag' },
    create: {
      id: 'food-bakery-bag',
      partnerId: freshMart.id,
      type: 'SALE',
      item: 'Fresh Bread & Pastry Mystery Bag',
      quantity: 6,
      reserved: 1,
      originalPricePaise: 18000,
      discountedPricePaise: 6000,
      pickupStart: new Date(Date.now() - 15 * 60 * 1000),
      pickupEnd: new Date(Date.now() + 5 * 60 * 60 * 1000),
      ingredients: 'Whole wheat bread, croissants, vegetable puff',
      allergens: 'VEG',
      consumeBy: new Date(Date.now() + 12 * 60 * 60 * 1000),
      handlingNeeds: 'Store at room temperature',
      neverServedConfirmed: true,
      active: true,
    },
    update: {},
  })

  const foodDonation = await prisma.foodListing.upsert({
    where: { id: 'food-donation-batch' },
    create: {
      id: 'food-donation-batch',
      partnerId: annapoorna.id,
      type: 'DONATION',
      item: 'Community Surplus: 20 Fresh Chapati & Dal Meals',
      quantity: 20,
      reserved: 0,
      originalPricePaise: 0,
      discountedPricePaise: 0,
      pickupStart: new Date(Date.now()),
      pickupEnd: new Date(Date.now() + 3 * 60 * 60 * 1000),
      ingredients: 'Wheat Chapatis, Dal Tadka, Mixed Vegetable Subzi',
      allergens: 'VEGAN,VEG',
      consumeBy: new Date(Date.now() + 5 * 60 * 60 * 1000),
      handlingNeeds: 'Packaged in insulated thermal boxes',
      neverServedConfirmed: true,
      active: true,
    },
    update: {},
  })

  await prisma.donationParcel.upsert({
    where: { id: 'parcel-srm-shelter' },
    create: {
      id: 'parcel-srm-shelter',
      listingId: foodDonation.id,
      partnerId: greenHands.id,
      parcelCode: 'PRCL-GH25',
      status: 'PENDING',
      quantity: 20,
    },
    update: {},
  })

  console.log('\n🎉 Seeding complete!')
  console.log('\nDemo accounts (OTP sent to console on login):')
  console.log('  user@demo       → Regular user (Priya Kumar)')
  console.log('  user2@demo      → Regular user (Arjun Sharma)')
  console.log('  merchant@demo   → Merchant at FreshMart Grocery')
  console.log('  restaurant@demo → Merchant at Annapoorna Kitchen')
  console.log('  reviewer@demo   → Reviewer role')
  console.log('  maintenance@demo→ Maintenance role')
  console.log('  foodpartner@demo→ Food Partner at GreenHands NGO')
  console.log('  sponsor@demo    → Sponsor at EcoBrand')
  console.log('  admin@demo      → Admin (full access)')
  console.log('\nAll funders/authorities marked Simulated. Rewards are illustrative (₹ values).')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
