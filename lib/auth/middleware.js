// Auth middleware helper for API routes
// Extracts and verifies the JWT from the request cookie

import { JWT_COOKIE_NAME } from '../utils/constants'
import { verifyToken } from './jwt'

// Extract and verify the auth token from an incoming API request
// Returns the decoded user payload { userId, email } or null if not authenticated
// Usage in any protected API route:
//   const user = getUserFromRequest(request)
//   if (!user) return sendError(null, 'Unauthorized', 401)
export function getUserFromRequest(request) {
  // Read the auth cookie from the incoming request
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value

  if (!token) {
    return null
  }

  // Verify the token and return the payload, or null if invalid
  return verifyToken(token)
}
