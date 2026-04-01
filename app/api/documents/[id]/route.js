// API route for single document operations
// DELETE /api/documents/:id — delete a document, its Cloudinary file, chunks, and Pinecone vectors

import { getUserFromRequest } from '../../../../lib/auth/middleware'
import { sendError, sendSuccess, handleApiError } from '../../../../lib/utils/errorHandler'
import { getDocumentByIdAndUserId, deleteDocument } from '../../../../lib/db/queries/documents'
import { deleteFile } from '../../../../lib/services/storage'
import { deleteVectorsByDocumentId } from '../../../../lib/services/vectordb'
import { deleteChunksByDocumentId } from '../../../../lib/db/queries/chunks'

// DELETE /api/documents/:id — delete a document owned by the current user
export async function DELETE(request, { params }) {
  try {
    const tokenPayload = getUserFromRequest(request)
    if (!tokenPayload) return sendError(null, 'Unauthorized', 401)

    const { id } = params

    // Verify the document exists and belongs to this user
    const document = await getDocumentByIdAndUserId(id, tokenPayload.userId)
    if (!document) return sendError(null, 'Document not found', 404)

    // Delete file from Cloudinary (non-throwing — deletion continues even if this fails)
    await deleteFile(document.cloudinaryPublicId)

    // Delete vectors from Pinecone (non-throwing — defined that way in vectordb.js)
    await deleteVectorsByDocumentId(id)

    // Delete chunks from PostgreSQL
    await deleteChunksByDocumentId(id)

    // Delete the document record — Prisma cascade handles any remaining relations
    await deleteDocument(id)

    return sendSuccess(null, null, 'Document deleted successfully')
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}
