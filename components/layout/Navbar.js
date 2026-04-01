// Navbar — top bar with app name, sidebar toggle (mobile), user name, logout

'use client'

import { useAuth } from '../../hooks/useAuth'

export default function Navbar({ user, onSidebarToggle }) {
  const { logout } = useAuth()

  async function handleLogout() {
    await logout()
  }

  return (
    <nav className="h-14 border-b border-zinc-800 bg-[#18181b] flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Left: hamburger (mobile only) + App name */}
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible on mobile */}
        <button
          className="md:hidden flex flex-col justify-center items-center gap-[5px] w-8 h-8 rounded hover:bg-zinc-700/50 transition-colors"
          onClick={onSidebarToggle}
          aria-label="Toggle sidebar"
        >
          <span className="block w-5 h-0.5 bg-zinc-400 rounded" />
          <span className="block w-5 h-0.5 bg-zinc-400 rounded" />
          <span className="block w-5 h-0.5 bg-zinc-400 rounded" />
        </button>
        <span className="text-base font-bold text-white tracking-tight">DocIntel</span>
      </div>

      {/* Right: user name + logout */}
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-zinc-400 hidden sm:inline">{user.name}</span>
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
