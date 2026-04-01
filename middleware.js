// Next.js middleware — protects routes by checking the auth cookie
// Uses 'jose' instead of 'jsonwebtoken' because middleware runs in
// Edge Runtime which does not support Node.js APIs that jsonwebtoken needs

import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { JWT_COOKIE_NAME } from './lib/utils/constants'

// Verify a JWT token using jose (Edge Runtime compatible)
// Returns the decoded payload or null if invalid
async function verifyTokenEdge(token) {
  try {
    if (!process.env.JWT_SECRET) return null
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Public paths that don't require authentication
  const publicPaths = ['/login', '/register']
  const publicApiPaths = ['/api/auth']

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))
  const isPublicApi = publicApiPaths.some((p) => pathname.startsWith(p))

  // Read and verify the auth cookie
  const token = request.cookies.get(JWT_COOKIE_NAME)?.value
  const user = token ? await verifyTokenEdge(token) : null

  // Already logged in — don't show login/register page
  if (user && isPublicPath) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Not logged in — redirect to login for protected pages
  if (!user && !isPublicPath && !isPublicApi) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
