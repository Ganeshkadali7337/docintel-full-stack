// MainLayoutClient — client-side wrapper for the main layout
// Owns the mobile sidebar open/close state so Navbar and page children
// can share it without needing a context or prop-drilling through a server component

'use client'

import { useState, createContext, useContext } from 'react'
import Navbar from './Navbar'

// Simple context to broadcast sidebar state to any child (e.g. DashboardPage → Sidebar)
export const SidebarContext = createContext({
  isSidebarOpen: false,
  onSidebarClose: () => {},
})

export function useSidebarState() {
  return useContext(SidebarContext)
}

function SidebarStateProvider({ isSidebarOpen, onSidebarClose, children }) {
  return (
    <SidebarContext.Provider value={{ isSidebarOpen, onSidebarClose }}>
      {children}
    </SidebarContext.Provider>
  )
}

export default function MainLayoutClient({ user, children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex flex-col h-screen">
      {/* Top navigation bar */}
      <Navbar
        user={user}
        onSidebarToggle={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Page content fills the remaining height — wrapped in sidebar context provider */}
      <div className="flex-1 overflow-hidden relative">
        <SidebarStateProvider
          isSidebarOpen={isSidebarOpen}
          onSidebarClose={() => setIsSidebarOpen(false)}
        >
          {children}
        </SidebarStateProvider>
      </div>
    </div>
  )
}
