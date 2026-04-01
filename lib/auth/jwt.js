// JWT (JSON Web Token) creation and verification
// Tokens are stored in httpOnly cookies to keep them secure

import jwt from 'jsonwebtoken'

// Create a JWT token for an authenticated user
// payload should be: { userId, email }
// Returns the signed token string
export function signToken(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables')
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  })
}

// Verify a JWT token and return its decoded payload
// Returns null if the token is invalid or expired — never throws
export function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set in environment variables')
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    // Token is invalid, expired, or tampered with
    return null
  }
}
