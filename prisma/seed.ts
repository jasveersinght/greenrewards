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

// Helper: create user + ensure CITIZEN role grant
async function createUser(
  email: string,
  displayName: string,
  city = 'Chennai',
  locality = 'Kattankulathur',
  username?: string
) {
  const defaultUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '')
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      displayName,
      city,
      locality,
      username: username ?? defaultUsername,
    },
    update: {
      displayName,
      city,
      locality,
      ...(username ? { username } : {}),
    },
  })
  await grantRole(user.id, 'CITIZEN', undefined, 'seed')
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
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS CouponCode_code_key ON CouponCode(code);')

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
    create: {
      id: 'partner-ecobrand',
      name: 'EcoBrand CSR (Simulated)',
      type: 'SPONSOR',
      approved: true,
      isSimulated: true,
    },
    update: {
      name: 'EcoBrand CSR (Simulated)',
      isSimulated: true,
    },
  })

  const freshMart = await prisma.partner.upsert({
    where: { id: 'partner-freshmart' },
    create: {
      id: 'partner-freshmart',
      name: 'FreshMart Grocery',
      type: 'SHOP',
      approved: true,
      isSimulated: false,
      address: 'Potheri High Road, Kattankulathur',
      locality: 'Potheri',
      phone: '+91 98765 43210',
      category: 'Grocery & Daily Essentials',
      openingHours: '8:00 AM - 10:00 PM',
      registrationNo: 'TN-KTR-2024-GR01',
      discountOffer: '₹30 off on ₹300+',
      locationId: locations[3].id,
    },
    update: {
      address: 'Potheri High Road, Kattankulathur',
      locality: 'Potheri',
      phone: '+91 98765 43210',
      category: 'Grocery & Daily Essentials',
      openingHours: '8:00 AM - 10:00 PM',
      discountOffer: '₹30 off on ₹300+',
    },
  })

  const quickFix = await prisma.partner.upsert({
    where: { id: 'partner-quickfix' },
    create: {
      id: 'partner-quickfix',
      name: 'Quick Fix Plumbing',
      type: 'PLUMBER',
      approved: true,
      isSimulated: false,
      address: 'Shop 4, Station Road, Potheri',
      locality: 'Potheri',
      serviceArea: 'Potheri, Guduvanchery, Kattankulathur',
      phone: '+91 94444 88990',
      registrationNo: 'PLUMB-KTR-889',
      discountOffer: '15% off repair service charge for Green Rewards citizens',
    },
    update: {
      address: 'Shop 4, Station Road, Potheri',
      locality: 'Potheri',
      serviceArea: 'Potheri, Guduvanchery, Kattankulathur',
      phone: '+91 94444 88990',
      discountOffer: '15% off repair service charge for Green Rewards citizens',
    },
  })

  const annapoorna = await prisma.partner.upsert({
    where: { id: 'partner-annapoorna' },
    create: {
      id: 'partner-annapoorna',
      name: 'Annapoorna Kitchen',
      type: 'RESTAURANT',
      approved: true,
      isSimulated: false,
      address: 'SRM Main Gate Road, Potheri',
      locality: 'Potheri',
      phone: '+91 98765 12345',
      category: 'Restaurant & Catering',
      locationId: locations[4].id,
    },
    update: {
      address: 'SRM Main Gate Road, Potheri',
      locality: 'Potheri',
      phone: '+91 98765 12345',
    },
  })

  const greenHands = await prisma.partner.upsert({
    where: { id: 'partner-greenhands' },
    create: {
      id: 'partner-greenhands',
      name: 'Simulated Food Bank (GreenHands NGO)',
      type: 'FOOD_PARTNER',
      approved: true,
      isSimulated: true,
      address: '42 Gandhi Road, Maraimalai Nagar',
      locality: 'Maraimalai Nagar',
      phone: '+91 98400 11223',
      locationId: locations[5].id,
    },
    update: {
      name: 'Simulated Food Bank (GreenHands NGO)',
      address: '42 Gandhi Road, Maraimalai Nagar',
      locality: 'Maraimalai Nagar',
      phone: '+91 98400 11223',
    },
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

  // Collection Centres for Food Partner
  await prisma.collectionCentre.upsert({
    where: { id: 'centre-gh-1' },
    create: {
      id: 'centre-gh-1',
      partnerId: greenHands.id,
      name: 'GreenHands Hub Maraimalai Nagar',
      address: '42 Gandhi Road, Maraimalai Nagar',
      locality: 'Maraimalai Nagar',
      lat: 12.7953,
      lng: 80.0271,
      openHours: '9:00 AM - 7:00 PM',
      contactPhone: '+91 98400 11223',
      active: true,
    },
    update: {},
  })

  await prisma.collectionCentre.upsert({
    where: { id: 'centre-gh-2' },
    create: {
      id: 'centre-gh-2',
      partnerId: greenHands.id,
      name: 'SRM Community Drop Point',
      address: 'Near SRM Arch, Potheri High Road',
      locality: 'Potheri',
      lat: 12.8231,
      lng: 80.0444,
      openHours: '10:00 AM - 6:00 PM',
      contactPhone: '+91 98400 99887',
      active: true,
    },
    update: {},
  })

  console.log('  ✅ Created partners and collection centres')

  // ──────────────────────────────────────────────────────────────
  // 3. USERS & DEMO ACCOUNTS
  // ──────────────────────────────────────────────────────────────
  // user@demo (Citizen only -> straight to /home)
  const userDemo = await createUser('user@demo', 'Priya Kumar', 'Chennai', 'Kattankulathur', 'user.demo')

  // user2@demo (Citizen only with a pending role application)
  const user2Demo = await createUser('user2@demo', 'Arjun Sharma', 'Chennai', 'Potheri', 'arjun.sharma')

  // shop@demo (Citizen + Shopkeeper "FreshMart", partnerId linked)
  const shopDemo = await createUser('shop@demo', 'Ravi Merchant', 'Chennai', 'Potheri', 'ravi.merchant')
  await grantRole(shopDemo.id, 'SHOPKEEPER', freshMart.id, 'seed')

  // plumber@demo (Citizen + Plumber "Quick Fix Plumbing", partnerId linked)
  const plumberDemo = await createUser('plumber@demo', 'Karthik Plumber', 'Chennai', 'Potheri', 'karthik.plumber')
  await grantRole(plumberDemo.id, 'PLUMBER', quickFix.id, 'seed')

  // ngo@demo (Citizen + Food partner "Simulated Food Bank", partnerId linked)
  const ngoDemo = await createUser('ngo@demo', 'GreenHands Coordinator', 'Chennai', 'Maraimalai Nagar', 'greenhands.ngo')
  await grantRole(ngoDemo.id, 'FOOD_PARTNER', greenHands.id, 'seed')

  // reviewer@demo (Citizen + Reviewer)
  const reviewerDemo = await createUser('reviewer@demo', 'Kavitha Reviewer', 'Chennai', 'Guduvancheri', 'kavitha.reviewer')
  await grantRole(reviewerDemo.id, 'REVIEWER', undefined, 'seed')

  // sponsor@demo (Citizen + Sponsor "EcoBrand CSR", partnerId linked)
  const sponsorDemo = await createUser('sponsor@demo', 'EcoBrand Manager', 'Chennai', 'Kattankulathur', 'ecobrand.manager')
  await grantRole(sponsorDemo.id, 'SPONSOR', ecoBrand.id, 'seed')

  // admin@demo (username admin.demo, Citizen + Reviewer + Admin + operator access)
  const adminDemo = await createUser('admin@demo', 'Admin User', 'Chennai', 'Kattankulathur', 'admin.demo')
  await grantRole(adminDemo.id, 'ADMIN', undefined, 'seed')
  await grantRole(adminDemo.id, 'REVIEWER', undefined, 'seed')
  await grantRole(adminDemo.id, 'PLUMBER', quickFix.id, 'seed')
  await grantRole(adminDemo.id, 'SHOPKEEPER', freshMart.id, 'seed')
  await grantRole(adminDemo.id, 'FOOD_PARTNER', greenHands.id, 'seed')
  await grantRole(adminDemo.id, 'SPONSOR', ecoBrand.id, 'seed')

  // Backward compatibility alias accounts
  const merchantDemo = await createUser('merchant@demo', 'Ravi Merchant', 'Chennai', 'Potheri')
  await grantRole(merchantDemo.id, 'SHOPKEEPER', freshMart.id, adminDemo.id)

  const foodPartnerDemo = await createUser('foodpartner@demo', 'GreenHands Coordinator', 'Chennai', 'Maraimalai Nagar')
  await grantRole(foodPartnerDemo.id, 'FOOD_PARTNER', greenHands.id, adminDemo.id)

  const restaurantDemo = await createUser('restaurant@demo', 'Meena Restaurant', 'Chennai', 'Potheri')
  await grantRole(restaurantDemo.id, 'SHOPKEEPER', annapoorna.id, adminDemo.id)

  // Seed pending role application from user2@demo so /admin/applications has sample data
  await prisma.roleApplication.upsert({
    where: { id: 'role-app-user2-shop' },
    create: {
      id: 'role-app-user2-shop',
      userId: user2Demo.id,
      role: 'SHOPKEEPER',
      organizationName: 'Sharma Organics & Cafe',
      locality: 'Potheri',
      phone: '+91 98765 00112',
      description: 'Organic produce and beverage store on GST road wanting to accept Green Points and issue reusable stamps.',
      shopAddress: '12 GST Road, Potheri, Chengalpattu 603203',
      shopCategory: 'Organic Grocery & Cafe',
      status: 'PENDING',
    },
    update: {},
  })

  // Seed realistic plumber repair claims
  await prisma.repairClaim.upsert({
    where: { id: 'claim-leak-potheri-1' },
    create: {
      id: 'claim-leak-potheri-1',
      userId: userDemo.id,
      plumberPartnerId: quickFix.id,
      assignedPlumberId: plumberDemo.id,
      repairStage: 'ACCEPTED',
      category: 'PIPE',
      address: 'Flat 302, Green Acres Apt, Potheri High Road',
      locality: 'Potheri',
      notes: 'Overhead tank distribution line leakage in utility balcony',
      beforePhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      evidenceUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      evidenceHash: 'hash-pipe-leak-1',
      status: 'PENDING',
    },
    update: {},
  })

  await prisma.repairClaim.upsert({
    where: { id: 'claim-leak-ktr-2' },
    create: {
      id: 'claim-leak-ktr-2',
      userId: user2Demo.id,
      plumberPartnerId: quickFix.id,
      assignedPlumberId: plumberDemo.id,
      repairStage: 'REPAIRED',
      category: 'TAP',
      address: '15 VOC Street, Kattankulathur',
      locality: 'Kattankulathur',
      notes: 'Kitchen brass valve seal replaced, 0.5 bar pressure restored',
      beforePhotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      afterPhotoUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
      meterReading: 142.8,
      evidenceUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      evidenceHash: 'hash-tap-leak-2',
      status: 'PENDING',
    },
    update: {},
  })

  await prisma.repairClaim.upsert({
    where: { id: 'claim-leak-gudu-3' },
    create: {
      id: 'claim-leak-gudu-3',
      userId: userDemo.id,
      repairStage: 'REQUESTED',
      category: 'TOILET',
      address: 'A-14 SRM Nagar, Guduvanchery',
      locality: 'Guduvanchery',
      notes: 'Cistern overflow valve stuck, continuous trickle',
      evidenceUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
      evidenceHash: 'hash-toilet-leak-3',
      status: 'PENDING',
    },
    update: {},
  })

  console.log('  ✅ Created users, role grants, applications & repair claims')

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
      description: 'Bring a reusable bag to FreshMart: 10 pts per stamp · +40 bonus at 5 stamps.',
      evidenceNeeded: 'Merchant scans your QR at checkout to confirm reusable bag use.',
      rewardRule: JSON.stringify({ type: 'STAMP_CARD', stampsNeeded: 5, bonusPoints: 40, perStampPoints: 10, perUserPerDay: 1 }),
      limits: JSON.stringify({ perUserPerDay: 1, perUserTotal: 50, totalSlots: 5000 }),
      isSimulated: false,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: reuseCampaign.id },
    create: { campaignId: reuseCampaign.id, totalPaise: 1000000 },
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
      description: 'Use a reusable bag at FreshMart checkout: 10 pts per stamp · +40 bonus at 5 stamps.',
      rewardText: '10 pts per stamp · +40 bonus at 5 stamps',
      conditions: 'One stamp per day per customer. Reusable item must be used at checkout.',
      stampsNeeded: 5,
      voucherValuePaise: 0,
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
      description: 'Report public water leaks in Potheri, Kattankulathur and Guduvancheri: 50 pts accepted · +100 when repaired.',
      evidenceNeeded: 'Photo of the leak + map pin. Public locations only (roads, stations, parks).',
      rewardRule: JSON.stringify({ acceptedPoints: 50, verifiedPoints: 100 }),
      limits: JSON.stringify({ perUserPerDay: 3, perUserTotal: 30, totalSlots: 500 }),
      isSimulated: true,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: leakCampaign.id },
    create: { campaignId: leakCampaign.id, totalPaise: 500000 },
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
      description: 'Reserve and pick up surplus food from Annapoorna Kitchen at a discount: 15 pts per pickup.',
      evidenceNeeded: 'Confirm pickup code at counter.',
      rewardRule: JSON.stringify({ pickupPoints: 15 }),
      limits: JSON.stringify({ perUserPerDay: 2, perUserTotal: 20, totalSlots: 1000 }),
      isSimulated: false,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: foodCampaign.id },
    create: { campaignId: foodCampaign.id, totalPaise: 800000 },
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
      description: '150 pts for 10% less vs your own bills: reduce your electricity consumption by 10% vs your baseline.',
      evidenceNeeded: 'Three billing periods of data required. Measured via device or bill entry.',
      rewardRule: JSON.stringify({ reductionPercent: 10, rewardPoints: 150 }),
      limits: JSON.stringify({ perUserPerDay: 1, perUserTotal: 1, totalSlots: 300 }),
      isSimulated: true,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: electricityCampaign.id },
    create: { campaignId: electricityCampaign.id, totalPaise: 600000 },
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
      description: '75 pts per verified repair: household plumbing repair confirmed by a reviewer.',
      evidenceNeeded: 'Upload repair evidence photo and optional plumber invoice. Reviewer verifies.',
      rewardRule: JSON.stringify({ repairPoints: 75 }),
      limits: JSON.stringify({ perUserPerDay: 1, perUserTotal: 3, totalSlots: 200 }),
      isSimulated: true,
    },
    update: { status: 'ACTIVE' },
  })
  await prisma.budget.upsert({
    where: { campaignId: waterCampaign.id },
    create: { campaignId: waterCampaign.id, totalPaise: 400000 },
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
      description: 'Take 5 metro or bus journeys in November: 5 pts per trip · +25 for 5 trips/week.',
      evidenceNeeded: 'Upload ticket image with journey date and ticket number. One per day, max 5.',
      rewardRule: JSON.stringify({ targetJourneys: 5, tripPoints: 5, streakPoints: 25, dailyLimit: 1 }),
      limits: JSON.stringify({ perUserPerDay: 1, perUserTotal: 5, totalSlots: 1200 }),
      isSimulated: true,
    },
    update: {},
  })
  await prisma.budget.upsert({
    where: { campaignId: commuteCampaign.id },
    create: { campaignId: commuteCampaign.id, totalPaise: 1200000 },
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
        account: 'USER_AVAILABLE',
        amountPoints: 500,
        amountPaise: null,
        entrySide: 'CREDIT',
        type: 'EARN',
        refType: 'SeedGrant',
        refId: 'seed-welcome-grant',
        note: 'Welcome Demo Green Points Grant (500 GP)',
      },
      {
        userId: userDemo.id,
        account: 'USER_PENDING',
        amountPoints: 50,
        amountPaise: null,
        entrySide: 'CREDIT',
        availableAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        type: 'EARN',
        refType: 'LeakCase',
        refId: 'seed-leak-lot',
        note: 'Accepted leak report pending lot',
      },
      {
        userId: user2Demo.id,
        campaignId: foodCampaign.id,
        account: 'USER_AVAILABLE',
        amountPoints: 15,
        amountPaise: null,
        entrySide: 'CREDIT',
        type: 'EARN',
        refType: 'Reservation',
        refId: 'seed-res-1',
        note: 'Food pickup reward approved (seed)',
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
        body: 'Your leak report near Potheri Bus Stand has been accepted. 50 Green Points is pending settlement.',
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

  // ──────────────────────────────────────────────────────────────
  // 9. REWARDS STORE: FUNDERS, CATALOG & COUPON CODES
  // ──────────────────────────────────────────────────────────────
  console.log('  🎁 Seeding Coupon Store...')

  const funderFreshMart = await prisma.funder.upsert({
    where: { id: 'funder-freshmart' },
    create: {
      id: 'funder-freshmart',
      name: 'FreshMart Grocery',
      type: 'MERCHANT',
      isSimulated: true,
    },
    update: {},
  })

  const funderEcoBrand = await prisma.funder.upsert({
    where: { id: 'funder-ecobrand' },
    create: {
      id: 'funder-ecobrand',
      name: 'EcoBrand CSR',
      type: 'SPONSOR',
      isSimulated: true,
    },
    update: {},
  })

  const funderGreenBite = await prisma.funder.upsert({
    where: { id: 'funder-greenbite' },
    create: {
      id: 'funder-greenbite',
      name: 'GreenBite Organic',
      type: 'BRAND',
      isSimulated: true,
    },
    update: {},
  })

  const couponsSeedData = [
    {
      id: 'item-fm-30',
      funderId: funderFreshMart.id,
      title: '₹30 Off on Grocery Basket',
      description: 'Get ₹30 off on any purchase of ₹300 or more at FreshMart grocery stores in Kattankulathur and Potheri.',
      pointsPrice: 100,
      faceValueText: '₹30 off on ₹300+',
      minSpendText: 'Min spend ₹300',
      validMerchantIds: freshMart.id,
      stockTotal: 40,
      stockRemaining: 40,
      perUserLimit: 2,
      validUntil: in60days,
      kind: 'PLATFORM_QR' as const,
      codePrefix: 'FM30',
    },
    {
      id: 'item-fm-50',
      funderId: funderFreshMart.id,
      title: '₹50 Off Super Saver Grocery Basket',
      description: 'Save ₹50 on essential staples, fresh vegetables, and grains when spending ₹500 or more at FreshMart.',
      pointsPrice: 180,
      faceValueText: '₹50 off on ₹500+',
      minSpendText: 'Min spend ₹500',
      validMerchantIds: freshMart.id,
      stockTotal: 30,
      stockRemaining: 30,
      perUserLimit: 1,
      validUntil: in60days,
      kind: 'PLATFORM_QR' as const,
      codePrefix: 'FM50',
    },
    {
      id: 'item-eco-home',
      funderId: funderEcoBrand.id,
      title: '₹100 Off Eco-Friendly Home Kit',
      description: 'Redeem for ₹100 discount on bamboo cookware, reusable storage bags, and biodegradable cleaner sets.',
      pointsPrice: 300,
      faceValueText: '₹100 off on ₹600+',
      minSpendText: 'Min spend ₹600',
      validMerchantIds: 'online code',
      stockTotal: 25,
      stockRemaining: 25,
      perUserLimit: 1,
      validUntil: in60days,
      kind: 'IMPORTED_CODE' as const,
      codePrefix: 'ECOKIT',
    },
    {
      id: 'item-eco-20pct',
      funderId: funderEcoBrand.id,
      title: '20% Off EcoBrand Sustainable Apparel',
      description: 'Receive 20% discount (up to ₹200 off) on organic cotton shirts, canvas totes, and bamboo fiber apparel.',
      pointsPrice: 250,
      faceValueText: '20% off up to ₹200',
      minSpendText: 'No minimum spend',
      validMerchantIds: 'online code',
      stockTotal: 35,
      stockRemaining: 35,
      perUserLimit: 2,
      validUntil: in60days,
      kind: 'IMPORTED_CODE' as const,
      codePrefix: 'ECO20',
    },
    {
      id: 'item-gb-75',
      funderId: funderGreenBite.id,
      title: '₹75 Off Organic Farm Fresh Basket',
      description: 'Enjoy ₹75 savings on locally sourced chemical-free seasonal fruits and vegetables from GreenBite farms.',
      pointsPrice: 220,
      faceValueText: '₹75 off on ₹450+',
      minSpendText: 'Min spend ₹450',
      validMerchantIds: null,
      stockTotal: 30,
      stockRemaining: 30,
      perUserLimit: 1,
      validUntil: in60days,
      kind: 'PLATFORM_QR' as const,
      codePrefix: 'GB75',
    },
    {
      id: 'item-gb-juice',
      funderId: funderGreenBite.id,
      title: 'Free Cold-Pressed Citrus Juice on ₹250+',
      description: 'Complimentary 300ml cold-pressed seasonal citrus juice (₹60 menu value) with any fresh sandwich or meal order.',
      pointsPrice: 150,
      faceValueText: 'Free Juice (₹60 value)',
      minSpendText: 'Min spend ₹250',
      validMerchantIds: null,
      stockTotal: 30,
      stockRemaining: 30,
      perUserLimit: 2,
      validUntil: in60days,
      kind: 'PLATFORM_QR' as const,
      codePrefix: 'JUICE',
    },
  ]

  for (const c of couponsSeedData) {
    const item = await prisma.couponCatalogItem.upsert({
      where: { id: c.id },
      create: {
        id: c.id,
        funderId: c.funderId,
        title: c.title,
        description: c.description,
        pointsPrice: c.pointsPrice,
        faceValueText: c.faceValueText,
        minSpendText: c.minSpendText,
        validMerchantIds: c.validMerchantIds,
        stockTotal: c.stockTotal,
        stockRemaining: c.stockRemaining,
        perUserLimit: c.perUserLimit,
        validUntil: c.validUntil,
        kind: c.kind,
        isActive: true,
      },
      update: {},
    })

    // Seed 10 unguessable codes per item
    for (let i = 1; i <= 10; i++) {
      const codeStr = `${c.codePrefix}-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
      await prisma.couponCode.upsert({
        where: { code: codeStr },
        create: {
          catalogItemId: item.id,
          code: codeStr,
          status: 'AVAILABLE',
        },
        update: {},
      })
    }
  }

  console.log('  ✅ Seeded 6 catalog items and 60 coupon codes')

  console.log('\n🎉 Seeding complete!')
  console.log('\nDemo accounts (OTP sent to console or available on /login):')
  console.log('  user@demo       → Citizen only (Priya Kumar)')
  console.log('  user2@demo      → Citizen with pending Shopkeeper application (Arjun Sharma)')
  console.log('  shop@demo       → Citizen + Shopkeeper at FreshMart Grocery (Ravi Merchant)')
  console.log('  plumber@demo    → Citizen + Plumber at Quick Fix Plumbing (Karthik Plumber)')
  console.log('  ngo@demo        → Citizen + Food Partner at Simulated Food Bank (GreenHands Coordinator)')
  console.log('  reviewer@demo   → Citizen + Reviewer (Kavitha Reviewer)')
  console.log('  sponsor@demo    → Citizen + Sponsor at EcoBrand (EcoBrand Manager)')
  console.log('  admin@demo      → username: admin.demo (Citizen + Reviewer + Admin)')
  console.log('\nAll funders/authorities marked Simulated. Green Points are non-monetary rewards.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
