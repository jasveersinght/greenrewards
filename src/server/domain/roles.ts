/**
 * Domain definitions for user roles and portal routing.
 */

export const ROLES = [
  'CITIZEN',
  'SHOPKEEPER',
  'PLUMBER',
  'REVIEWER',
  'FOOD_PARTNER',
  'SPONSOR',
  'ADMIN',
] as const

export type AppRole = (typeof ROLES)[number]

export const ROLE_HOME_PATHS: Record<AppRole, string> = {
  CITIZEN: '/home',
  SHOPKEEPER: '/merchant',
  PLUMBER: '/plumber',
  REVIEWER: '/reviewer',
  FOOD_PARTNER: '/partner',
  SPONSOR: '/sponsor',
  ADMIN: '/admin',
}

export const ROLE_LABELS: Record<AppRole, string> = {
  CITIZEN: 'Citizen',
  SHOPKEEPER: 'Shopkeeper',
  PLUMBER: 'Plumber',
  REVIEWER: 'Reviewer',
  FOOD_PARTNER: 'Food Partner (NGO)',
  SPONSOR: 'Sponsor',
  ADMIN: 'Admin',
}

export const ROLE_BADGES: Record<AppRole, string> = {
  CITIZEN: 'Citizen mode',
  SHOPKEEPER: 'Shopkeeper mode',
  PLUMBER: 'Plumber mode',
  REVIEWER: 'Reviewer mode',
  FOOD_PARTNER: 'Food Partner mode',
  SPONSOR: 'Sponsor mode',
  ADMIN: 'Admin mode',
}

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  CITIZEN: 'Earn Green Points for sustainable actions, view local impact, and redeem coupons.',
  SHOPKEEPER: 'Scan customer reuse stamps, verify claims, and redeem store coupons.',
  PLUMBER: 'Accept household leak & pipe repair jobs, log service proofs, and earn community trust.',
  REVIEWER: 'Verify leak reports, inspect repair evidence, validate transit tickets, and review audit items.',
  FOOD_PARTNER: 'Manage surplus food rescue parcels, dispatch volunteer deliveries, and confirm drops.',
  SPONSOR: 'Fund reward campaigns, issue brand coupons, and monitor corporate sustainability metrics.',
  ADMIN: 'Oversee system security, review role applications, manage users & staff, and audit ledger integrity.',
}

// Applications are only allowed for these roles
export const APPLIABLE_ROLES: AppRole[] = [
  'SHOPKEEPER',
  'PLUMBER',
  'FOOD_PARTNER',
  'SPONSOR',
]

export function isAppliableRole(role: string): role is 'SHOPKEEPER' | 'PLUMBER' | 'FOOD_PARTNER' | 'SPONSOR' {
  return (APPLIABLE_ROLES as readonly string[]).includes(role)
}

/**
 * Normalizes legacy role strings (e.g. MERCHANT -> SHOPKEEPER, USER -> CITIZEN)
 */
export function normalizeRole(role: string): AppRole {
  const upper = role.toUpperCase()
  if (upper === 'MERCHANT') return 'SHOPKEEPER'
  if (upper === 'USER') return 'CITIZEN'
  if ((ROLES as readonly string[]).includes(upper)) return upper as AppRole
  return 'CITIZEN'
}
