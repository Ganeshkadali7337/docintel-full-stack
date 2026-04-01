// API routes for document listing and uploading
// GET  /api/documents — list all documents for the logged-in user
// POST /api/documents — upload a new document and trigger processing pipeline

import { getUserFromRequest } from '../../../lib/auth/middleware'
import { sendError, sendSuccess, handleApiError } from '../../../lib/utils/errorHandler'
import { validateFile } from '../../../lib/utils/fileValidation'
import { uploadFile } from '../../../lib/services/storage'
import { extractText } from '../../../lib/services/extractor'
import { chunkText } from '../../../lib/services/chunker'
import { generateEmbeddingsForChunks } from '../../../lib/services/embedder'
import { upsertVectors } from '../../../lib/services/vectordb'
import { createChunks, getChunksByDocumentId } from '../../../lib/db/queries/chunks'
import {
  createDocument,
  getDocumentsByUserId,
  updateDocumentStatus,
  updateDocumentPageCount,
} from '../../../lib/db/queries/documents'

// GET /api/documents — return all documents for the logged-in user
export async function GET(request) {
  try {
    const tokenPayload = getUserFromRequest(request)
    if (!tokenPayload) return sendError(null, 'Unauthorized', 401)

    const documents = await getDocumentsByUserId(tokenPayload.userId)
    return sendSuccess(null, { documents })
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}

// POST /api/documents — parse uploaded file, save to Cloudinary + DB,
// then fire the processing pipeline in the background
export async function POST(request) {
  try {
    const tokenPayload = getUserFromRequest(request)
    if (!tokenPayload) return sendError(null, 'Unauthorized', 401)

    // Parse multipart form data using the native Web API (works in App Router)
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) return sendError(null, 'No file provided', 400)

    // Validate before uploading to Cloudinary
    // so we never waste Cloudinary storage on invalid files
    const validation = validateFile({
      size: file.size,
      mimetype: file.type,
      originalFilename: file.name,
    })
    if (!validation.valid) return sendError(null, validation.error, 400)

    // Generate a safe filename — no spaces, prefixed with timestamp
    const safeFilename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`

    // Convert Web API File to Node.js Buffer — needed for Cloudinary and extraction
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload the file to Cloudinary
    const { url: cloudinaryUrl, publicId: cloudinaryPublicId } = await uploadFile(
      buffer,
      safeFilename,
      'docintel/documents'
    )

    // Each upload gets its own independent document record and
    // processing pipeline. Concurrent uploads are safe because
    // they never share state — each has a unique ID and runs
    // its pipeline independently.
    const document = await createDocument(
      tokenPayload.userId,
      safeFilename,
      file.name,
      file.size,
      cloudinaryUrl,
      cloudinaryPublicId
    )

    // Fire the processing pipeline in the background — do NOT await it
    // The API responds immediately with the PENDING document
    // The pipeline updates status to PROCESSING → READY / FAILED on its own
    runProcessingPipeline(document, buffer, file.type)

    return sendSuccess(null, { document }, 'Document uploaded successfully', 201)
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}

// Run the full text extraction and embedding pipeline in the background
// Updates document status at each stage so the frontend can poll progress
// Adapts to the enhanced extractor (warnings) and chunker (sectionTitle)
async function runProcessingPipeline(document, buffer, mimetype) {
  try {
    // Step 1: Mark document as PROCESSING so the UI shows the processing badge
    await updateDocumentStatus(document.id, 'PROCESSING')

    // Step 2: Extract text from the file buffer
    // extractor returns { text, pageCount, error, warnings }
    const { text, pageCount, error: extractionError, warnings } = await extractText(
      buffer,
      mimetype
    )

    // If extraction failed, mark as FAILED with a clear reason
    if (extractionError || !text) {
      await updateDocumentStatus(
        document.id,
        'FAILED',
        extractionError || 'Could not extract text from document'
      )
      return
    }

    // Log any non-fatal warnings (e.g. table detection notices)
    if (warnings && warnings.length > 0) {
      console.log(`Document ${document.id} extraction warnings:`, warnings)
    }

    // Step 3: Save the page count now that we know it
    await updateDocumentPageCount(document.id, pageCount)

    // Step 4: Split text into chunks
    // Pass null for sectionTitle — no section info at this level
    // (sectionTitle could be used later if we detect headings)
    const chunks = chunkText(text, pageCount, null)

    if (chunks.length === 0) {
      await updateDocumentStatus(
        document.id,
        'FAILED',
        'Document contains no extractable text content'
      )
      return
    }

    // Step 5: Save chunks to PostgreSQL
    await createChunks(document.id, chunks)

    // Step 6: Generate OpenAI embeddings for all chunks
    const embeddingsWithIndex = await generateEmbeddingsForChunks(chunks)

    // Step 7: Load the saved chunks from DB to get their real IDs
    const savedChunks = await getChunksByDocumentId(document.id)

    // Step 8: Build the vector objects for Pinecone
    // Match each saved chunk to its embedding by chunkIndex
    const vectors = savedChunks.map((savedChunk) => {
      const embeddingResult = embeddingsWithIndex.find(
        (e) => e.chunkIndex === savedChunk.chunkIndex
      )
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

    // Step 9: Store all embeddings in Pinecone
    await upsertVectors(vectors)

    // Step 10: Mark document as READY — polling will pick this up
    await updateDocumentStatus(document.id, 'READY')
  } catch (error) {
    // Any unhandled error marks the document as FAILED
    console.error('Processing pipeline failed:', error.message)
    await updateDocumentStatus(
      document.id,
      'FAILED',
      `Processing failed: ${error.message}`
    )
  }
}
