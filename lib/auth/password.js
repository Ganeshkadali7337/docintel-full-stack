// Password hashing and comparison using bcrypt
// Never store plain text passwords — always hash before saving to DB

import bcrypt from 'bcryptjs'
import { SALT_ROUNDS } from '../utils/constants'

// Hash a plain text password before saving it to the database
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

// Compare a plain text password against a stored bcrypt hash
// Returns true if they match, false otherwise
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash)
}
