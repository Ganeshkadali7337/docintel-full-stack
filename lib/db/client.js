// Prisma client singleton — prevents multiple DB connections during hot reload
// In development, Next.js hot reloads modules which would create new PrismaClient
// instances on every reload. This pattern reuses the same instance.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = global

// Reuse existing instance if available (development), otherwise create new one
export const prisma = globalForPrisma.prisma || new PrismaClient()

// Save instance to global in development so hot reloads reuse it
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
