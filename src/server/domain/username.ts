/**
 * Username validation and admin reservation rules.
 */

const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/

// Lookalikes of "admin" to prevent spoofing
const ADMIN_LOOKALIKE_PATTERNS = [
  /^admin/i,
  /^_admin/i,
  /^\.admin/i,
  /^adm1n/i,
  /^adm[iíìîï1l|]n/i,
  /^4dm[iíìîï1l|]n/i,
  /^админ/i, // Cyrillic homoglyph
]

export function isValidUsernameFormat(username: string): boolean {
  if (!username || typeof username !== 'string') return false
  const clean = username.trim().toLowerCase()
  return USERNAME_REGEX.test(clean) && !clean.startsWith('.') && !clean.endsWith('.')
}

export function isAdminLookalike(usernameOrHandle: string): boolean {
  if (!usernameOrHandle || typeof usernameOrHandle !== 'string') return false
  const clean = usernameOrHandle.trim().toLowerCase()
  return ADMIN_LOOKALIKE_PATTERNS.some(p => p.test(clean))
}

export function isStaffUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false
  return username.trim().toLowerCase().startsWith('admin')
}

export interface ValidateUsernameResult {
  valid: boolean
  error?: string
  normalized?: string
}

export function validateUsernameChoice(
  username: string,
  options: { isStaffCreation?: boolean } = {}
): ValidateUsernameResult {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' }
  }

  const clean = username.trim().toLowerCase()

  if (!isValidUsernameFormat(clean)) {
    return {
      valid: false,
      error: 'Username must be 3-30 characters and can only contain lowercase letters, numbers, dots, and underscores.',
    }
  }

  const isLookalike = isAdminLookalike(clean)
  if (isLookalike && !options.isStaffCreation) {
    return {
      valid: false,
      error: "Usernames starting with 'admin' or look-alikes are reserved for system staff.",
    }
  }

  return { valid: true, normalized: clean }
}

export function validateStaffAdminAccount(username: string, roles: string[]): ValidateUsernameResult {
  const result = validateUsernameChoice(username, { isStaffCreation: true })
  if (!result.valid) return result

  if (roles.includes('ADMIN') && !result.normalized?.startsWith('admin')) {
    return {
      valid: false,
      error: "All staff accounts holding the ADMIN role must have a username starting with 'admin' (e.g. admin.name or admin_name).",
    }
  }

  return result
}
