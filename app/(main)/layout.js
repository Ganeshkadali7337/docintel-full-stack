// Main app layout — wraps all protected pages (the dashboard)
// Fetches the current user server-side and redirects to login if not authenticated

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Navbar from '../../components/layout/Navbar'
import { verifyToken } from '../../lib/auth/jwt'
import { getUserById } from '../../lib/db/queries/users'
import { JWT_COOKIE_NAME } from '../../lib/utils/constants'

// Server component — fetches user from DB using JWT in the cookie
export default async function MainLayout({ children }) {
  // Read the auth cookie from the incoming request
  const cookieStore = await cookies()
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value

  // Verify the token and extract user ID
  const tokenPayload = token ? verifyToken(token) : null

  if (!tokenPayload) {
    // No valid token — send to login
    redirect('/login')
  }

  // Load the full user record from the database
  const user = await getUserById(tokenPayload.userId)

  if (!user) {
    // User was deleted — send to login
    redirect('/login')
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top navigation bar with user info and logout */}
      <Navbar user={user} />

      {/* Page content fills the remaining height */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
