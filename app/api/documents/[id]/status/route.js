// API route to poll a document's processing status
// GET /api/documents/:id/status — used by the frontend to track processing progress

export const dynamic = 'force-dynamic'

import { getUserFromRequest } from '../../../../../lib/auth/middleware'
import { sendError, sendSuccess, handleApiError } from '../../../../../lib/utils/errorHandler'
import { getDocumentByIdAndUserId } from '../../../../../lib/db/queries/documents'

// GET /api/documents/:id/status — return current status of a document
export async function GET(request, { params }) {
  try {
    // Step 1: Verify the user is logged in
    const tokenPayload = getUserFromRequest(request)
    if (!tokenPayload) {
      return sendError(null, 'Unauthorized', 401)
    }

    // Step 2: Get the document ID from the URL
    const { id } = params

    // Step 3: Find the document — also checks it belongs to this user
    const document = await getDocumentByIdAndUserId(id, tokenPayload.userId)
    if (!document) {
      return sendError(null, 'Document not found', 404)
    }

    // Step 4: Return only status-related fields (not the full document)
    return sendSuccess(null, {
      id: document.id,
      status: document.status,
      errorMessage: document.errorMessage,
      pageCount: document.pageCount,
    })
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}
