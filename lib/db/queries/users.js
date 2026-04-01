// Database query functions for the User table
// All user-related DB operations go here — keeps API routes clean

import { prisma } from '../client'

// Create a new user in the database
// passwordHash should already be hashed — never pass a plain text password
export async function createUser(name, email, passwordHash) {
  return await prisma.user.create({
    data: { name, email, passwordHash },
  })
}

// Find a user by their email address (used during login)
export async function getUserByEmail(email) {
  return await prisma.user.findUnique({
    where: { email },
  })
}

// Find a user by their ID (used to load the current logged-in user)
export async function getUserById(id) {
  return await prisma.user.findUnique({
    where: { id },
  })
}
