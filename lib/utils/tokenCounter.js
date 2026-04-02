// Token counting utility using tiktoken
// Used to measure chunk sizes before sending to OpenAI
// cl100k_base encoding matches both GPT-4o and text-embedding-3-small

import { get_encoding } from 'tiktoken'

// Create the encoder once and reuse it — creating it is expensive
const encoder = get_encoding('cl100k_base')

// Count how many tokens a string contains
// Truncates extremely long unbroken strings (e.g. base64, long URLs) before
// encoding — tiktoken throws "token too long" on strings > ~8000 chars without spaces
export function countTokens(text) {
  const safe = text.replace(/\S{2000,}/g, (m) => m.slice(0, 2000));
  try {
    return encoder.encode(safe).length;
  } catch {
    return Math.ceil(safe.length / 4);
  }
}

// Check if a text is within a given token limit
// Returns true if it fits, false if it exceeds
export function isWithinTokenLimit(text, limit) {
  return countTokens(text) <= limit
}
