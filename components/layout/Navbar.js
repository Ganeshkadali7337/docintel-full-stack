// Navbar — top bar with app name, user name, logout — dark theme

'use client'

import { useAuth } from '../../hooks/useAuth'

export default function Navbar({ user }) {
  const { logout } = useAuth()

  async function handleLogout() {
    await logout()
  }

  return (
    <nav className="h-14 border-b border-zinc-800 bg-[#18181b] flex items-center justify-between px-6 shrink-0">
      {/* Left: App name */}
      <span className="text-base font-bold text-white tracking-tight">DocIntel</span>

      {/* Right: user name + logout */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-zinc-400">{user.name}</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-white underline transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
