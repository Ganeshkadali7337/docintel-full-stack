// API route for single document operations
// DELETE /api/documents/:id — delete a document and its Cloudinary file

import { getUserFromRequest } from '../../../../lib/auth/middleware'
import { sendError, sendSuccess, handleApiError } from '../../../../lib/utils/errorHandler'
import { getDocumentByIdAndUserId, deleteDocument } from '../../../../lib/db/queries/documents'
import { deleteFile } from '../../../../lib/services/storage'

// DELETE /api/documents/:id — delete a document owned by the current user
export async function DELETE(request, { params }) {
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

    // Step 4: Delete the file from Cloudinary (won't throw if it fails)
    await deleteFile(document.cloudinaryPublicId)

    // Step 5: Delete the document record from the database
    // (Prisma cascade will also delete related chunks and conversation links)
    await deleteDocument(id)

    // TODO Part 2: Also delete vectors from Pinecone here
    // using: await vectordb.deleteByDocumentId(id)
    // This ensures no orphaned vectors remain after document deletion

    return sendSuccess(null, null, 'Document deleted successfully')
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}
