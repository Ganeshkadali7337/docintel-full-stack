// Centralized error handling utilities for all API routes
// Use these helpers to keep error responses consistent across the app

import { NextResponse } from 'next/server'

// Send a JSON error response with a status code
// Usage: return sendError(null, 'Something went wrong', 400)
export function sendError(response, message, statusCode = 500) {
  return NextResponse.json({ error: message }, { status: statusCode })
}

// Send a JSON success response with data and an optional message
// Usage: return sendSuccess(null, { user }, 'Login successful', 200)
export function sendSuccess(response, data, message = 'Success', statusCode = 200) {
  return NextResponse.json({ data, message }, { status: statusCode })
}

// Map known error types to user-friendly messages and status codes
// Used in the catch block of every API route
// Usage:
//   try { ... }
//   catch (error) {
//     const { message, status } = handleApiError(error)
//     return sendError(null, message, status)
//   }
export function handleApiError(error) {
  // Prisma unique constraint violation (e.g. duplicate email)
  if (error.code === 'P2002') {
    return { message: 'Email already exists', status: 409 }
  }

  // JWT token is malformed or tampered with
  if (error.name === 'JsonWebTokenError') {
    return { message: 'Invalid token', status: 401 }
  }

  // JWT token has expired
  if (error.name === 'TokenExpiredError') {
    return { message: 'Token expired, please login again', status: 401 }
  }

  // Anything else — use the error's own message or a generic fallback
  return {
    message: error.message || 'Internal server error',
    status: 500,
  }
}
