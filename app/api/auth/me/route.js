// API route to get the currently logged-in user
// GET /api/auth/me — returns the user's profile from their JWT cookie

export const dynamic = 'force-dynamic'


import { getUserById } from '../../../../lib/db/queries/users'
import { getUserFromRequest } from '../../../../lib/auth/middleware'
import { sendError, sendSuccess, handleApiError } from '../../../../lib/utils/errorHandler'

export async function GET(request) {
  try {
    // Step 1: Verify auth token from cookie
    const tokenPayload = getUserFromRequest(request)
    if (!tokenPayload) {
      return sendError(null, 'Unauthorized', 401)
    }

    // Step 2: Load the user from the database using the ID from the token
    const user = await getUserById(tokenPayload.userId)

    // Step 3: If user no longer exists (e.g. was deleted), reject
    if (!user) {
      return sendError(null, 'Unauthorized', 401)
    }

    // Step 4: Return user data — never include passwordHash
    return sendSuccess(null, {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    })
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}
