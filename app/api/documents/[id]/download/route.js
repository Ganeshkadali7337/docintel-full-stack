// GET /api/documents/[id]/download
// Proxies the file from Cloudinary so the browser downloads it with the correct
// filename and extension. Required because cross-origin <a download> is ignored by browsers.

export const dynamic = 'force-dynamic'

import { getUserFromRequest } from '../../../../../lib/auth/middleware'
import { sendError, handleApiError } from '../../../../../lib/utils/errorHandler'
import { getDocumentByIdAndUserId } from '../../../../../lib/db/queries/documents'

export async function GET(request, { params }) {
  try {
    const tokenPayload = getUserFromRequest(request)
    if (!tokenPayload) return sendError(null, 'Unauthorized', 401)

    const { id } = params

    // Verify document exists and belongs to this user
    const document = await getDocumentByIdAndUserId(id, tokenPayload.userId)
    if (!document) return sendError(null, 'Document not found', 404)

    // Fetch the file from Cloudinary server-side
    const cloudinaryResponse = await fetch(document.cloudinaryUrl)
    if (!cloudinaryResponse.ok) {
      return sendError(null, 'Failed to fetch file from storage', 502)
    }

    // Determine content type from cloudinary response or fall back based on filename
    const contentType =
      cloudinaryResponse.headers.get('content-type') || 'application/octet-stream'

    // Sanitise filename for Content-Disposition header
    const safeFilename = document.originalName.replace(/["\\\r\n]/g, '_')

    return new Response(cloudinaryResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // attachment forces browser to download rather than display
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        // Forward content-length if available so the browser shows progress
        ...(cloudinaryResponse.headers.get('content-length')
          ? { 'Content-Length': cloudinaryResponse.headers.get('content-length') }
          : {}),
      },
    })
  } catch (error) {
    const { message, status } = handleApiError(error)
    return sendError(null, message, status)
  }
}
