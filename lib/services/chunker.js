// Text chunking service — splits extracted document text into smaller pieces
// Paragraph-aware: respects natural document structure instead of cutting mid-sentence
// Each chunk tracks its position and estimated page number for source attribution

import { countTokens } from '../utils/tokenCounter.js'
import { CHUNK_SIZE_TOKENS } from '../utils/constants.js'

// Split full document text into an array of chunk objects
// pageCount is used to estimate which page each chunk comes from
export function chunkText(text, pageCount) {
  // First split into paragraphs to respect document structure
  const paragraphs = splitIntoParagraphs(text)

  // Then group paragraphs into token-limited chunks with overlap
  const chunks = groupParagraphsIntoChunks(paragraphs, pageCount)

  return chunks
}

// Split text into paragraphs by blank lines
// Filters out very short fragments that are likely noise (page numbers, headers)
function splitIntoParagraphs(text) {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)
}

// Group paragraphs into chunks that stay within CHUNK_SIZE_TOKENS
// Keeps last paragraph from previous chunk as overlap for context continuity
function groupParagraphsIntoChunks(paragraphs, pageCount) {
  const chunks = []
  let currentParagraphs = []
  let currentTokenCount = 0
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph)

    // If a single paragraph is bigger than our limit, split it by sentences
    if (paragraphTokens > CHUNK_SIZE_TOKENS) {
      // Save what we have first
      if (currentParagraphs.length > 0) {
        chunks.push(buildChunk(currentParagraphs.join('\n\n'), chunkIndex, pageCount, chunks.length))
        chunkIndex++
        currentParagraphs = []
        currentTokenCount = 0
      }
      // Split oversized paragraph into sentence-level chunks
      const sentenceChunks = splitLargeParagraph(paragraph, pageCount, chunkIndex)
      chunks.push(...sentenceChunks)
      chunkIndex += sentenceChunks.length
      continue
    }

    // Adding this paragraph would exceed the limit — save current chunk first
    if (currentTokenCount + paragraphTokens > CHUNK_SIZE_TOKENS && currentParagraphs.length > 0) {
      chunks.push(buildChunk(currentParagraphs.join('\n\n'), chunkIndex, pageCount, chunks.length))
      chunkIndex++

      // Keep the last paragraph as overlap so context isn't lost between chunks
      const overlapParagraphs = currentParagraphs.slice(-1)
      currentParagraphs = [...overlapParagraphs, paragraph]
      currentTokenCount = countTokens(currentParagraphs.join('\n\n'))
    } else {
      currentParagraphs.push(paragraph)
      currentTokenCount += paragraphTokens
    }
  }

  // Save whatever is left as the final chunk
  if (currentParagraphs.length > 0) {
    chunks.push(buildChunk(currentParagraphs.join('\n\n'), chunkIndex, pageCount, chunks.length))
  }

  return chunks
}

// Split a single oversized paragraph into sentence-level chunks
function splitLargeParagraph(paragraph, pageCount, startIndex) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
  const chunks = []
  let currentSentences = []
  let currentTokenCount = 0
  let index = startIndex

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence)

    if (currentTokenCount + sentenceTokens > CHUNK_SIZE_TOKENS && currentSentences.length > 0) {
      chunks.push(buildChunk(currentSentences.join(' '), index, pageCount, chunks.length))
      index++
      currentSentences = [sentence]
      currentTokenCount = sentenceTokens
    } else {
      currentSentences.push(sentence)
      currentTokenCount += sentenceTokens
    }
  }

  if (currentSentences.length > 0) {
    chunks.push(buildChunk(currentSentences.join(' '), index, pageCount, chunks.length))
  }

  return chunks
}

// Build a chunk object with content and metadata
// Estimates page number from the chunk's relative position in the document
function buildChunk(content, chunkIndex, pageCount, totalChunksSoFar) {
  // Approximate page by position — not exact but good enough for source attribution
  const estimatedPage = pageCount
    ? Math.max(1, Math.ceil((chunkIndex + 1) / Math.max(1, pageCount)))
    : null

  return {
    content: content.trim(),
    chunkIndex,
    pageNumber: estimatedPage,
    tokenCount: countTokens(content),
  }
}
