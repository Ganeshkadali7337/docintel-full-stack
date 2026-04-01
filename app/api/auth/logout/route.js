// API route for logging out
// POST /api/auth/logout — clears the auth cookie

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { JWT_COOKIE_NAME } from '../../../../lib/utils/constants'
import { handleApiError, sendError } from '../../../../lib/utils/errorHandler'

export async function POST(request) {
  try {
    // Step 1: Create a success response
    const response = NextResponse.json(
      { data: null, message: 'Logged out successfully' },
      { status: 200 }
    )

    // Step 2: Clear the auth cookie by setting maxAge to 0
    response.cookies.set(JWT_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Immediately expires the cookie
    })

    return response
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}
