// Pinecone vector database service
// Stores, queries, and deletes document embeddings
// Vectors are used during Q&A (Part 3) to find the most relevant chunks

import { Pinecone } from '@pinecone-database/pinecone'

if (!process.env.PINECONE_API_KEY) {
  throw new Error('PINECONE_API_KEY environment variable is not set')
}
if (!process.env.PINECONE_INDEX_NAME) {
  throw new Error('PINECONE_INDEX_NAME environment variable is not set')
}

// Initialize Pinecone client once and reuse it
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
})

// Get the Pinecone index — called every time to avoid stale references
function getIndex() {
  return pinecone.index(process.env.PINECONE_INDEX_NAME)
}

// Store chunk embeddings in Pinecone
// Each vector includes metadata so we can filter by documentId during queries
export async function upsertVectors(vectors) {
  const index = getIndex()

  const pineconeVectors = vectors.map((v) => ({
    id: v.chunkId,
    values: v.embedding,
    metadata: {
      documentId: v.documentId,
      userId: v.userId,
      chunkIndex: v.chunkIndex,
      pageNumber: v.pageNumber || 0,
      // Pinecone metadata limit is 40KB per vector — store full chunk content
      contentPreview: v.contentPreview.substring(0, 2000),
    },
  }))

  // Pinecone recommends batches of 100 or fewer
  // SDK v7 requires { records: [...] } — plain array no longer accepted
  const BATCH_SIZE = 100
  for (let i = 0; i < pineconeVectors.length; i += BATCH_SIZE) {
    const batch = pineconeVectors.slice(i, i + BATCH_SIZE)
    await index.upsert({ records: batch })
  }
}

// Query Pinecone for chunks most similar to the query embedding
// Filters to a specific document so results are always from the right file
// Retries once if 0 results are returned — handles Pinecone serverless cold starts
export async function queryVectors(queryEmbedding, documentId, topK = 5) {
  const index = getIndex()

  const run = () =>
    index.query({
      vector: queryEmbedding,
      topK,
      filter: { documentId: { $eq: documentId } },
      includeMetadata: true,
    })

  let results = await run()
  let matches = results.matches || []

  // Pinecone serverless can return 0 results on cold start — retry once after a short wait
  if (matches.length === 0) {
    console.warn(`[queryVectors] 0 results for doc ${documentId}, retrying in 1s...`)
    await new Promise((r) => setTimeout(r, 1000))
    results = await run()
    matches = results.matches || []
  }

  console.log(`[queryVectors] doc=${documentId} matches=${matches.length}`)
  return matches
}

// Query Pinecone across multiple documents at once
// Returns results grouped by documentId
// Used in Part 4 for multi-document comparison
export async function queryVectorsForMultipleDocs(queryEmbedding, documentIds, topKPerDoc = 3) {
  const allResults = await Promise.all(
    documentIds.map(async (documentId) => {
      const matches = await queryVectors(queryEmbedding, documentId, topKPerDoc)
      return { documentId, matches }
    })
  )
  return allResults
}

// Delete all vectors belonging to a document from Pinecone
// Called when a document is deleted — keeps Pinecone in sync with the DB
// Does not throw — document deletion should continue even if this fails
export async function deleteVectorsByDocumentId(documentId) {
  try {
    const index = getIndex()
    // SDK v7 requires filter to be nested under a `filter` key
    await index.deleteMany({ filter: { documentId } })
  } catch (error) {
    console.error('Failed to delete vectors from Pinecone:', error.message)
  }
}
