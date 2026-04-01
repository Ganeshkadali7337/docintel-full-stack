// Database queries for the Chunk table
// Chunks are the split pieces of document text stored after extraction

import { prisma } from '../client.js'

// Save multiple chunks to the database in a single query
// Called after chunking is complete in the processing pipeline
export async function createChunks(documentId, chunks) {
  return await prisma.chunk.createMany({
    data: chunks.map((chunk) => ({
      documentId,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      tokenCount: chunk.tokenCount,
    })),
  })
}

// Get all chunks for a document ordered by position
// Used when building RAG context in Part 3
export async function getChunksByDocumentId(documentId) {
  return await prisma.chunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: 'asc' },
  })
}

// Get specific chunks by their IDs
// Used for source attribution after retrieval in Part 3
export async function getChunksByIds(chunkIds) {
  return await prisma.chunk.findMany({
    where: { id: { in: chunkIds } },
  })
}

// Delete all chunks belonging to a document
// Called when a document is deleted
export async function deleteChunksByDocumentId(documentId) {
  return await prisma.chunk.deleteMany({
    where: { documentId },
  })
}
