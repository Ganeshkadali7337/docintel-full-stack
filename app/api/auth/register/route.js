// API route for user registration
// POST /api/auth/register — creates a new user account and returns a JWT cookie

import { NextResponse } from 'next/server'
import { createUser, getUserByEmail } from '../../../../lib/db/queries/users'
import { hashPassword } from '../../../../lib/auth/password'
import { signToken } from '../../../../lib/auth/jwt'
import { sendError, sendSuccess, handleApiError } from '../../../../lib/utils/errorHandler'
import { JWT_COOKIE_NAME } from '../../../../lib/utils/constants'

export async function POST(request) {
  try {
    // Step 1: Parse the request body
    const body = await request.json()
    const { name, email, password } = body

    // Step 2: Validate required fields
    if (!name || !email || !password) {
      return sendError(null, 'Name, email, and password are required', 400)
    }

    // Validate email format
    if (!email.includes('@')) {
      return sendError(null, 'Please provide a valid email address', 400)
    }

    // Validate password length
    if (password.length < 8) {
      return sendError(null, 'Password must be at least 8 characters', 400)
    }

    // Step 3: Check if email is already registered
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return sendError(null, 'Email already registered', 409)
    }

    // Step 4: Hash the password before saving
    const passwordHash = await hashPassword(password)

    // Step 5: Create the user in the database
    const user = await createUser(name, email, passwordHash)

    // Step 6: Sign a JWT token for the new user
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
        message: 'Account created successfully',
      },
      { status: 201 }
    )

    // Step 8: Set the auth cookie (httpOnly so JS can't read it)
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
