'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="btn-secondary"
      style={{ borderColor: '#ef4444', color: '#ef4444' }}
      aria-label="Sign out"
    >
      {loading ? '⏳ Signing out...' : '🚪 Sign Out'}
    </button>
  )
}
