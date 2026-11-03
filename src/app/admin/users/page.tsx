'use client'

import React, { useEffect, useState } from 'react'
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Plus,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'
import { ROLES, ROLE_LABELS, type AppRole } from '@/server/domain/roles'

interface UserItem {
  id: string
  email: string
  username?: string | null
  displayName?: string | null
  locality?: string | null
  city?: string | null
  isSuspended: boolean
  roles: string[]
  roleGrants: Array<{
    id: string
    role: string
    partner?: { name: string } | null
  }>
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Manage Roles Modal
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  // Create Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [staffName, setStaffName] = useState('')
  const [staffEmail, setStaffEmail] = useState('')
  const [staffUsername, setStaffUsername] = useState('admin.')
  const [staffRoles, setStaffRoles] = useState<string[]>(['ADMIN'])

  useEffect(() => {
    loadUsers()
  }, [roleFilter])

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      const q = encodeURIComponent(search)
      const res = await fetch(`/api/admin/users?q=${q}&role=${roleFilter}`)
      const data = await res.json()
      setUsers(data.users || [])
    } catch {
      setError('Failed to fetch user accounts')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleRole(userId: string, role: string, currentGranted: boolean) {
    setActionLoading(`${userId}_${role}`)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: currentGranted ? 'REVOKE' : 'GRANT',
          role,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || data.error || 'Failed to modify role')
        return
      }

      setSuccess(`Role ${role} ${currentGranted ? 'revoked' : 'granted'} successfully.`)
      await loadUsers()
      if (selectedUser && selectedUser.id === userId) {
        const updated = users.find(u => u.id === userId)
        if (updated) setSelectedUser(updated)
      }
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setActionLoading('create_staff')

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: staffName,
          email: staffEmail,
          username: staffUsername,
          roles: staffRoles,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create staff account')
        return
      }

      setShowStaffModal(false)
      setStaffName('')
      setStaffEmail('')
      setStaffUsername('admin.')
      setSuccess(`Staff account @${data.user.username} created successfully!`)
      await loadUsers()
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif text-slate-900">Users &amp; Role Grants</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit user accounts, assign verified portal access grants, and create system staff accounts.
          </p>
        </div>
        <button
          onClick={() => setShowStaffModal(true)}
          className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Create Staff Account</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            loadUsers()
          }}
          className="relative flex-1 min-w-[240px]"
        >
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, @username, or citizen name..."
            className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-full focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
        >
          <option value="ALL">All Roles</option>
          {ROLES.map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">User / Handle</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Active Grants</th>
              <th className="py-3 px-4">Locality</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">Loading accounts...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">No users found matching query.</td>
              </tr>
            ) : (
              users.map((u) => {
                const isAdminStaff = u.username?.startsWith('admin')
                return (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{u.displayName || 'Anonymous'}</span>
                        {isAdminStaff && (
                          <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[9px] font-bold uppercase tracking-wider">
                            Staff
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {u.username ? `@${u.username}` : 'No username set'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map(r => (
                          <span
                            key={r}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              r === 'ADMIN'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : r === 'REVIEWER'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : r === 'SHOPKEEPER'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : r === 'PLUMBER'
                                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                : r === 'FOOD_PARTNER'
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : r === 'SPONSOR'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.locality || 'Chennai'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="py-1 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] transition-colors"
                      >
                        Manage Roles
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Manage Roles Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 font-serif text-lg">
                  Manage Grants: {selectedUser.displayName || selectedUser.email}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedUser.username ? `@${selectedUser.username}` : selectedUser.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Toggle roles granted to this account. Non-citizen roles allow access to specific operational workspaces.
              </p>

              <div className="space-y-2">
                {ROLES.filter(r => r !== 'CITIZEN').map((r) => {
                  const isGranted = selectedUser.roles.includes(r)
                  const isLoadingThis = actionLoading === `${selectedUser.id}_${r}`

                  return (
                    <div
                      key={r}
                      className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{ROLE_LABELS[r]}</div>
                        <div className="text-[11px] text-slate-500">System Role: {r}</div>
                      </div>

                      <button
                        onClick={() => handleToggleRole(selectedUser.id, r, isGranted)}
                        disabled={Boolean(isLoadingThis)}
                        className={`py-1.5 px-3 rounded-xl font-bold text-xs transition-colors ${
                          isGranted
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {isLoadingThis ? 'Processing...' : isGranted ? 'Revoke Role' : 'Grant Role'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="py-2 px-4 rounded-xl bg-slate-900 text-white font-semibold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div>
              <h3 className="font-bold text-slate-900 font-serif text-lg">Create System Staff Account</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Staff accounts holding the ADMIN role must have a username starting with &apos;admin.&apos; or &apos;admin_&apos;.
              </p>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Jasveer Singh"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="admin.jasveer@chennaigreen.gov.in"
                  className="w-full p-2.5 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Staff Username * (Must start with &apos;admin&apos;)
                </label>
                <input
                  type="text"
                  required
                  value={staffUsername}
                  onChange={(e) => setStaffUsername(e.target.value.toLowerCase())}
                  placeholder="admin.jasveer"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
                <p className="mt-1 text-[10px] text-slate-400">
                  Reserved prefix &apos;admin&apos; enforced for system security and audit compliance.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Roles to Grant</label>
                <div className="grid grid-cols-2 gap-2">
                  {['ADMIN', 'REVIEWER', 'SPONSOR'].map((r) => {
                    const checked = staffRoles.includes(r)
                    return (
                      <label key={r} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setStaffRoles([...staffRoles, r])
                            else setStaffRoles(staffRoles.filter(x => x !== r))
                          }}
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <span className="font-semibold text-slate-700">{r}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'create_staff'}
                  className="py-2 px-5 rounded-xl bg-slate-900 text-white font-semibold shadow-2xs transition-colors disabled:opacity-50"
                >
                  {actionLoading === 'create_staff' ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
