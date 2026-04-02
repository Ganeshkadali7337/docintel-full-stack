// POST /api/documents/[id]/retry
// Re-runs the full processing pipeline for a FAILED document
// Clears old partial data (chunks + vectors), re-downloads file from Cloudinary, re-processes

export const dynamic = 'force-dynamic'

import { getUserFromRequest } from '../../../../../lib/auth/middleware'
import { sendError, sendSuccess, handleApiError } from '../../../../../lib/utils/errorHandler'
import { getDocumentByIdAndUserId, updateDocumentStatus, updateDocumentPageCount } from '../../../../../lib/db/queries/documents'
import { deleteChunksByDocumentId, createChunks, getChunksByDocumentId } from '../../../../../lib/db/queries/chunks'
import { deleteVectorsByDocumentId, upsertVectors } from '../../../../../lib/services/vectordb'
import { downloadFile } from '../../../../../lib/services/storage'
import { extractText } from '../../../../../lib/services/extractor'
import { chunkText } from '../../../../../lib/services/chunker'
import { generateEmbeddingsForChunks } from '../../../../../lib/services/embedder'

export async function POST(request, { params }) {
  try {
    const tokenPayload = getUserFromRequest(request)
    if (!tokenPayload) return sendError(null, 'Unauthorized', 401)

    const { id } = params

    // Verify document belongs to user
    const document = await getDocumentByIdAndUserId(id, tokenPayload.userId)
    if (!document) return sendError(null, 'Document not found', 404)

    // Only allow retrying documents that actually failed
    if (document.status !== 'FAILED') {
      return sendError(null, 'Only failed documents can be retried', 400)
    }

    // Respond immediately — pipeline runs in background
    runRetryPipeline(document)

    return sendSuccess(null, { id: document.id }, 'Retry started')
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}

async function runRetryPipeline(document) {
  try {
    // Step 1: Reset status to PROCESSING and clear previous error
    await updateDocumentStatus(document.id, 'PROCESSING', null)

    // Step 2: Clean up any partial data from the previous failed attempt
    await deleteChunksByDocumentId(document.id)
    await deleteVectorsByDocumentId(document.id)

    // Step 3: Re-download the original file from Cloudinary using signed SDK URL
    let buffer
    try {
      buffer = await downloadFile(document.cloudinaryUrl)
    } catch (err) {
      console.error('Retry download error:', err.message)
      await updateDocumentStatus(document.id, 'FAILED', `Could not retrieve file from storage: ${err.message}`)
      return
    }

    // Step 4: Detect mime type from filename
    const mimetype = document.filename.endsWith('.pdf')
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    // Step 5: Extract text
    const { text, pageCount, error: extractionError, warnings } = await extractText(buffer, mimetype)

    if (extractionError || !text) {
      await updateDocumentStatus(document.id, 'FAILED', extractionError || 'Could not extract text from document')
      return
    }

    if (warnings && warnings.length > 0) {
      console.log(`Retry ${document.id} extraction warnings:`, warnings)
    }

    // Step 6: Update page count
    await updateDocumentPageCount(document.id, pageCount)

    // Step 7: Chunk text
    const chunks = chunkText(text, pageCount, null)
    if (chunks.length === 0) {
      await updateDocumentStatus(document.id, 'FAILED', 'Document contains no extractable text content')
      return
    }

    // Step 8: Save chunks to DB
    await createChunks(document.id, chunks)

    // Step 9: Generate embeddings
    const embeddingsWithIndex = await generateEmbeddingsForChunks(chunks)

    // Step 10: Load saved chunks to get their DB IDs
    const savedChunks = await getChunksByDocumentId(document.id)

    // Step 11: Build vector objects
    const vectors = savedChunks.map((savedChunk) => {
      const embeddingResult = embeddingsWithIndex.find(e => e.chunkIndex === savedChunk.chunkIndex)
      return {
        chunkId: savedChunk.id,
        documentId: document.id,
        userId: document.userId,
        embedding: embeddingResult.embedding,
        chunkIndex: savedChunk.chunkIndex,
        pageNumber: savedChunk.pageNumber,
        contentPreview: savedChunk.content,
      }
    })

    // Step 12: Upsert into Pinecone
    await upsertVectors(vectors)

    // Step 13: Mark as READY
    await updateDocumentStatus(document.id, 'READY')
  } catch (error) {
    console.error('Retry pipeline failed:', error.message)
    await updateDocumentStatus(document.id, 'FAILED', `Processing failed: ${error.message}`)
  }
}
