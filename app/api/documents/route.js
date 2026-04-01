// API routes for document listing and uploading
// GET  /api/documents — list all documents for the logged-in user
// POST /api/documents — upload a new document

import { getUserFromRequest } from '../../../lib/auth/middleware'
import { sendError, sendSuccess, handleApiError } from '../../../lib/utils/errorHandler'
import { validateFile } from '../../../lib/utils/fileValidation'
import { uploadFile } from '../../../lib/services/storage'
import { createDocument, getDocumentsByUserId, updateDocumentStatus } from '../../../lib/db/queries/documents'

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

// POST /api/documents — parse uploaded file using Web API FormData and save it
export async function POST(request) {
  try {
    const tokenPayload = getUserFromRequest(request)
    if (!tokenPayload) return sendError(null, 'Unauthorized', 401)

    // Parse multipart form data using the native Web API (works in App Router)
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) return sendError(null, 'No file provided', 400)

    // Validate file type, size, and extension
    const validation = validateFile({
      size: file.size,
      mimetype: file.type,
      originalFilename: file.name,
    })

    if (!validation.valid) return sendError(null, validation.error, 400)

    // Generate a safe filename with timestamp prefix to avoid collisions
    const safeFilename = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`

    // Convert the Web API File to a Node.js Buffer for Cloudinary upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Cloudinary
    const { url: cloudinaryUrl, publicId: cloudinaryPublicId } = await uploadFile(
      buffer,
      safeFilename,
      'docintel/documents'
    )

    // Save document record to the database
    const document = await createDocument(
      tokenPayload.userId,
      safeFilename,
      file.name,
      file.size,
      cloudinaryUrl,
      cloudinaryPublicId
    )

    // TODO Part 2: Replace this with the actual extraction + embedding pipeline.
    // The pipeline will update status: PENDING → PROCESSING → READY/FAILED
    // For now in Part 1, immediately mark as READY so polling stops.
    await updateDocumentStatus(document.id, 'READY')
    document.status = 'READY'

    return sendSuccess(null, { document }, 'Document uploaded successfully', 201)
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}
