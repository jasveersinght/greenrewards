import { describe, it, expect } from 'vitest'
import {
  ROLES,
  ROLE_HOME_PATHS,
  ROLE_LABELS,
  ROLE_BADGES,
  ROLE_DESCRIPTIONS,
  APPLIABLE_ROLES,
  normalizeRole,
  isAppliableRole,
} from '@/server/domain/roles'
import {
  isValidUsernameFormat,
  isAdminLookalike,
  isStaffUsername,
  validateUsernameChoice,
  validateStaffAdminAccount,
} from '@/server/domain/username'
import { createSession, verifySession } from '@/server/session'
import { prisma } from '@/server/db'
import fs from 'fs'
import path from 'path'

describe('Domain: Roles and Routing', () => {
  it('defines all 7 canonical application roles', () => {
    expect(ROLES).toEqual([
      'CITIZEN',
      'SHOPKEEPER',
      'PLUMBER',
      'REVIEWER',
      'FOOD_PARTNER',
      'SPONSOR',
      'ADMIN',
    ])
  })

  it('maps each role to its dedicated home portal', () => {
    expect(ROLE_HOME_PATHS.CITIZEN).toBe('/home')
    expect(ROLE_HOME_PATHS.SHOPKEEPER).toBe('/merchant')
    expect(ROLE_HOME_PATHS.PLUMBER).toBe('/plumber')
    expect(ROLE_HOME_PATHS.REVIEWER).toBe('/reviewer')
    expect(ROLE_HOME_PATHS.FOOD_PARTNER).toBe('/partner')
    expect(ROLE_HOME_PATHS.SPONSOR).toBe('/sponsor')
    expect(ROLE_HOME_PATHS.ADMIN).toBe('/admin')
  })

  it('maps each role to human-readable labels, badges and descriptions', () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeDefined()
      expect(ROLE_BADGES[role]).toContain('mode')
      expect(ROLE_DESCRIPTIONS[role]).toBeDefined()
      expect(ROLE_DESCRIPTIONS[role].length).toBeGreaterThan(15)
    }
  })

  it('allows citizens to apply ONLY for SHOPKEEPER, PLUMBER, FOOD_PARTNER, and SPONSOR', () => {
    expect(APPLIABLE_ROLES).toEqual([
      'SHOPKEEPER',
      'PLUMBER',
      'FOOD_PARTNER',
      'SPONSOR',
    ])
    expect(isAppliableRole('SHOPKEEPER')).toBe(true)
    expect(isAppliableRole('PLUMBER')).toBe(true)
    expect(isAppliableRole('FOOD_PARTNER')).toBe(true)
    expect(isAppliableRole('SPONSOR')).toBe(true)
    expect(isAppliableRole('ADMIN')).toBe(false)
    expect(isAppliableRole('REVIEWER')).toBe(false)
    expect(isAppliableRole('CITIZEN')).toBe(false)
  })

  it('normalizes legacy and mixed-case roles', () => {
    expect(normalizeRole('MERCHANT')).toBe('SHOPKEEPER')
    expect(normalizeRole('merchant')).toBe('SHOPKEEPER')
    expect(normalizeRole('USER')).toBe('CITIZEN')
    expect(normalizeRole('user')).toBe('CITIZEN')
    expect(normalizeRole('admin')).toBe('ADMIN')
    expect(normalizeRole('plumber')).toBe('PLUMBER')
    expect(normalizeRole('food_partner')).toBe('FOOD_PARTNER')
    expect(normalizeRole('unknown_role')).toBe('CITIZEN')
  })
})

describe('Domain: Username Validation & Staff Restrictions', () => {
  it('validates proper username formats', () => {
    expect(isValidUsernameFormat('priya.kumar')).toBe(true)
    expect(isValidUsernameFormat('karthik_plumber')).toBe(true)
    expect(isValidUsernameFormat('arjun123')).toBe(true)

    expect(isValidUsernameFormat('ab')).toBe(false) // too short
    expect(isValidUsernameFormat('.leadingdot')).toBe(false)
    expect(isValidUsernameFormat('trailingdot.')).toBe(false)
    expect(isValidUsernameFormat('invalid space')).toBe(false)
    expect(isValidUsernameFormat('has@symbol')).toBe(false)
  })

  it('detects admin lookalikes to prevent spoofing', () => {
    expect(isAdminLookalike('admin.demo')).toBe(true)
    expect(isAdminLookalike('admin_ops')).toBe(true)
    expect(isAdminLookalike('adm1n')).toBe(true)
    expect(isAdminLookalike('_admin')).toBe(true)
    expect(isAdminLookalike('.admin')).toBe(true)
    expect(isAdminLookalike('regular_user')).toBe(false)
  })

  it('rejects citizens choosing admin or lookalike handles', () => {
    const res1 = validateUsernameChoice('admin.hacker', { isStaffCreation: false })
    expect(res1.valid).toBe(false)
    expect(res1.error).toContain('reserved for system staff')

    const res2 = validateUsernameChoice('adm1n_super', { isStaffCreation: false })
    expect(res2.valid).toBe(false)
    expect(res2.error).toContain('reserved for system staff')

    const validCitizen = validateUsernameChoice('priya_chennai', { isStaffCreation: false })
    expect(validCitizen.valid).toBe(true)
    expect(validCitizen.normalized).toBe('priya_chennai')
  })

  it('enforces that staff accounts holding ADMIN must start with admin prefix', () => {
    const validStaff = validateStaffAdminAccount('admin.ops', ['ADMIN'])
    expect(validStaff.valid).toBe(true)

    const invalidStaff = validateStaffAdminAccount('super_moderator', ['ADMIN'])
    expect(invalidStaff.valid).toBe(false)
    expect(invalidStaff.error).toContain("must have a username starting with 'admin'")
  })

  it('correctly identifies staff usernames', () => {
    expect(isStaffUsername('admin.demo')).toBe(true)
    expect(isStaffUsername('admin_kavitha')).toBe(true)
    expect(isStaffUsername('kavitha.admin')).toBe(false)
    expect(isStaffUsername('priya')).toBe(false)
  })
})

describe('Security: Session and Role Switching', () => {
  it('single-role user gets CITIZEN activeRole by default', async () => {
    const testUser = await prisma.user.upsert({
      where: { email: 'test.single.role@greenrewards.test' },
      create: {
        email: 'test.single.role@greenrewards.test',
        displayName: 'Test Single Role',
        username: 'test.single.role',
      },
      update: {},
    })

    const token = await createSession(
      {
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
        displayName: testUser.displayName,
      },
      ['CITIZEN']
    )

    const session = await verifySession(token)
    expect(session).not.toBeNull()
    expect(session?.activeRole).toBe('CITIZEN')
    expect(session?.roles).toEqual(['CITIZEN'])
  })

  it('multi-role user can activate any granted role', async () => {
    const testUser = await prisma.user.upsert({
      where: { email: 'test.multi.role@greenrewards.test' },
      create: {
        email: 'test.multi.role@greenrewards.test',
        displayName: 'Test Multi Role',
        username: 'test.multi.role',
      },
      update: {},
    })

    // Grant PLUMBER
    await prisma.roleGrant.upsert({
      where: {
        userId_role_partnerId: {
          userId: testUser.id,
          role: 'PLUMBER',
          partnerId: 'partner-quickfix',
        },
      },
      create: {
        userId: testUser.id,
        role: 'PLUMBER',
        partnerId: 'partner-quickfix',
        grantedBy: 'test',
      },
      update: { revokedAt: null },
    })

    const token = await createSession(
      {
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
        displayName: testUser.displayName,
      },
      ['CITIZEN', 'PLUMBER'],
      ['partner-quickfix'],
      'PLUMBER'
    )

    const session = await verifySession(token)
    expect(session).not.toBeNull()
    expect(session?.activeRole).toBe('PLUMBER')
    expect(session?.roles).toContain('PLUMBER')
    expect(session?.roles).toContain('CITIZEN')
  })

  it('revoking a role grant automatically downgrades activeRole to CITIZEN on next lookup', async () => {
    const testUser = await prisma.user.upsert({
      where: { email: 'test.revoke.role@greenrewards.test' },
      create: {
        email: 'test.revoke.role@greenrewards.test',
        displayName: 'Test Revoke Role',
        username: 'test.revoke.role',
      },
      update: {},
    })

    const grant = await prisma.roleGrant.upsert({
      where: {
        userId_role_partnerId: {
          userId: testUser.id,
          role: 'REVIEWER',
          partnerId: '',
        },
      },
      create: {
        userId: testUser.id,
        role: 'REVIEWER',
        partnerId: null,
        grantedBy: 'test',
      },
      update: { revokedAt: null },
    })

    const token = await createSession(
      {
        id: testUser.id,
        email: testUser.email,
        username: testUser.username,
        displayName: testUser.displayName,
      },
      ['CITIZEN', 'REVIEWER'],
      [],
      'REVIEWER'
    )

    // Verify session initially has REVIEWER
    let session = await verifySession(token)
    expect(session?.activeRole).toBe('REVIEWER')

    // Revoke the grant in database
    await prisma.roleGrant.update({
      where: { id: grant.id },
      data: { revokedAt: new Date() },
    })

    // Next verification should detect revoked role and fall back to CITIZEN
    session = await verifySession(token)
    expect(session?.activeRole).toBe('CITIZEN')
    expect(session?.roles).not.toContain('REVIEWER')
  })
})

describe('Security Guard: No Admin Login page or button', () => {
  it('confirms no admin login route exists in src/app', () => {
    const adminLoginDir = path.join(process.cwd(), 'src', 'app', 'admin', 'login')
    expect(fs.existsSync(adminLoginDir)).toBe(false)
  })

  it('confirms no page or component contains "Admin login" label', () => {
    function searchDir(dir: string): string[] {
      const results: string[] = []
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
            results.push(...searchDir(full))
          }
        } else if (/\.(tsx|ts|jsx|js|html)$/.test(entry.name)) {
          const content = fs.readFileSync(full, 'utf-8')
          if (content.toLowerCase().includes('admin login')) {
            results.push(full)
          }
        }
      }
      return results
    }

    const matches = searchDir(path.join(process.cwd(), 'src'))
    expect(matches).toEqual([])
  })
})
