// Text chunking service — splits extracted document text into smaller pieces
// Paragraph-aware: respects natural document structure instead of cutting mid-sentence
// Each chunk tracks its position and estimated page number for source attribution

import { countTokens } from "../utils/tokenCounter.js";
import { CHUNK_SIZE_TOKENS, CHUNK_OVERLAP_TOKENS } from "../utils/constants.js";

// Split full document text into an array of chunk objects
// pageCount is used to estimate which page each chunk comes from
// sectionTitle is optional — prepended to each chunk for source attribution
export function chunkText(text, pageCount, sectionTitle = null) {
  // First split into paragraphs to respect document structure
  const paragraphs = splitIntoParagraphs(text);

  // Then group paragraphs into token-limited chunks with overlap
  const chunks = groupParagraphsIntoChunks(paragraphs, pageCount, sectionTitle);

  return chunks;
}

// Split text into paragraphs by blank lines
// Filters out very short fragments that are likely noise (page numbers, headers)
function splitIntoParagraphs(text) {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);
}

// Group paragraphs into chunks that stay within CHUNK_SIZE_TOKENS
// Uses CHUNK_OVERLAP_TOKENS for precise token-based overlap instead of full paragraph carry-over
function groupParagraphsIntoChunks(paragraphs, pageCount, sectionTitle) {
  const chunks = [];
  let currentParagraphs = [];
  let currentTokenCount = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph);

    // If a single paragraph is bigger than our limit, split it by sentences
    if (paragraphTokens > CHUNK_SIZE_TOKENS) {
      // Save what we have first
      if (currentParagraphs.length > 0) {
        chunks.push(
          buildChunk(
            currentParagraphs.join("\n\n"),
            chunkIndex,
            pageCount,
            chunks.length,
            sectionTitle,
          ),
        );
        chunkIndex++;
        currentParagraphs = [];
        currentTokenCount = 0;
      }
      // Split oversized paragraph into sentence-level chunks
      const sentenceChunks = splitLargeParagraph(
        paragraph,
        pageCount,
        chunkIndex,
        sectionTitle,
      );
      chunks.push(...sentenceChunks);
      chunkIndex += sentenceChunks.length;
      continue;
    }

    // Adding this paragraph would exceed the limit — save current chunk first
    if (
      currentTokenCount + paragraphTokens > CHUNK_SIZE_TOKENS &&
      currentParagraphs.length > 0
    ) {
      chunks.push(
        buildChunk(
          currentParagraphs.join("\n\n"),
          chunkIndex,
          pageCount,
          chunks.length,
          sectionTitle,
        ),
      );
      chunkIndex++;

      // Trim overlap to exactly CHUNK_OVERLAP_TOKENS from end of current chunk
      const overlapText = getOverlapText(currentParagraphs.join("\n\n"));
      currentParagraphs = overlapText ? [overlapText, paragraph] : [paragraph];
      currentTokenCount = countTokens(currentParagraphs.join("\n\n"));
    } else {
      currentParagraphs.push(paragraph);
      currentTokenCount += paragraphTokens;
    }
  }

  // Save whatever is left as the final chunk
  if (currentParagraphs.length > 0) {
    chunks.push(
      buildChunk(
        currentParagraphs.join("\n\n"),
        chunkIndex,
        pageCount,
        chunks.length,
        sectionTitle,
      ),
    );
  }

  return chunks;
}

// Extract last CHUNK_OVERLAP_TOKENS tokens from end of text for precise overlap
function getOverlapText(text) {
  const words = text.split(" ");
  let overlap = "";
  for (let i = words.length - 1; i >= 0; i--) {
    const candidate = words.slice(i).join(" ");
    if (countTokens(candidate) <= CHUNK_OVERLAP_TOKENS) {
      overlap = candidate;
    } else {
      break;
    }
  }
  return overlap;
}

// Split a single oversized paragraph into sentence-level chunks
function splitLargeParagraph(paragraph, pageCount, startIndex, sectionTitle) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
  const chunks = [];
  let currentSentences = [];
  let currentTokenCount = 0;
  let index = startIndex;

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);

    if (
      currentTokenCount + sentenceTokens > CHUNK_SIZE_TOKENS &&
      currentSentences.length > 0
    ) {
      chunks.push(
        buildChunk(
          currentSentences.join(" "),
          index,
          pageCount,
          chunks.length,
          sectionTitle,
        ),
      );
      index++;
      currentSentences = [sentence];
      currentTokenCount = sentenceTokens;
    } else {
      currentSentences.push(sentence);
      currentTokenCount += sentenceTokens;
    }
  }

  if (currentSentences.length > 0) {
    chunks.push(
      buildChunk(
        currentSentences.join(" "),
        index,
        pageCount,
        chunks.length,
        sectionTitle,
      ),
    );
  }

  return chunks;
}

// Build a chunk object with content and metadata
// Estimates page number from chunk's relative position across total document
// Prepends sectionTitle if provided — helps GPT-4o know where the chunk came from
function buildChunk(
  content,
  chunkIndex,
  pageCount,
  totalChunksSoFar,
  sectionTitle,
) {
  const estimatedPage = pageCount
    ? Math.max(
        1,
        Math.ceil(
          ((chunkIndex + 1) / Math.max(1, totalChunksSoFar + 1)) * pageCount,
        ),
      )
    : null;

  // Prepend section title if available so retrieval carries context
  const contentWithTitle = sectionTitle
    ? `[Section: ${sectionTitle}]\n\n${content.trim()}`
    : content.trim();

  return {
    content: contentWithTitle,
    chunkIndex,
    pageNumber: estimatedPage,
    tokenCount: countTokens(contentWithTitle),
  };
}
