// Embedding service — generates vector embeddings using OpenAI API
// Embeddings are numerical representations of text used for semantic search
// These are stored in Pinecone and queried during Q&A

import OpenAI from "openai";
import { EMBEDDING_MODEL } from "../utils/constants.js";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set");
}

// Initialize the OpenAI client once and reuse it
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate an embedding vector for a single piece of text
// Returns an array of numbers (1536 dimensions for text-embedding-3-small)
export async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    encoding_format: "float",
  });
  return response.data[0].embedding;
}

// Generate embeddings for all chunks, processing in batches to avoid rate limits
// Returns array of { chunkIndex, embedding }
export async function generateEmbeddingsForChunks(chunks) {
  const results = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // Process each batch in parallel for speed
    const batchResults = await Promise.all(
      batch.map(async (chunk) => {
        const embedding = await generateEmbedding(chunk.content);
        return { chunkIndex: chunk.chunkIndex, embedding };
      }),
    );

    results.push(...batchResults);

    // Small pause between batches to stay within OpenAI rate limits
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}
