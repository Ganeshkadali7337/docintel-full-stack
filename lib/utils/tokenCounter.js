// Token counting utility using tiktoken
// Used to measure chunk sizes before sending to OpenAI
// cl100k_base encoding matches both GPT-4o and text-embedding-3-small

import { get_encoding } from 'tiktoken'

// Create the encoder once and reuse it — creating it is expensive
const encoder = get_encoding('cl100k_base')

// Count how many tokens a string contains
export function countTokens(text) {
  return encoder.encode(text).length
}

// Check if a text is within a given token limit
// Returns true if it fits, false if it exceeds
export function isWithinTokenLimit(text, limit) {
  return countTokens(text) <= limit
}
