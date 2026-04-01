// API route for user login
// POST /api/auth/login — verifies credentials and returns a JWT cookie

import { NextResponse } from 'next/server'
import { getUserByEmail } from '../../../../lib/db/queries/users'
import { comparePassword } from '../../../../lib/auth/password'
import { signToken } from '../../../../lib/auth/jwt'
import { sendError, handleApiError } from '../../../../lib/utils/errorHandler'
import { JWT_COOKIE_NAME } from '../../../../lib/utils/constants'

export async function POST(request) {
  try {
    // Step 1: Parse the request body
    const body = await request.json()
    const { email, password } = body

    // Step 2: Validate required fields
    if (!email || !password) {
      return sendError(null, 'Email and password are required', 400)
    }

    // Step 3: Look up the user by email
    const user = await getUserByEmail(email)

    // Step 4: Return same error whether email or password is wrong
    // This prevents attackers from knowing if an email is registered
    if (!user) {
      return sendError(null, 'Invalid email or password', 401)
    }

    // Step 5: Compare the provided password with the stored hash
    const passwordMatches = await comparePassword(password, user.passwordHash)
    if (!passwordMatches) {
      return sendError(null, 'Invalid email or password', 401)
    }

    // Step 6: Sign a JWT token for this user
    const token = signToken({ userId: user.id, email: user.email })

    // Step 7: Build the response — never include passwordHash
    const response = NextResponse.json(
      {
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
        },
        message: 'Logged in successfully',
      },
      { status: 200 }
    )

    // Step 8: Set the auth cookie
    response.cookies.set(JWT_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
    })

    return response
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}
