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

    // Sanitise filename for Content-Disposition header
    const safeFilename = document.originalName.replace(/["\\\r\n]/g, '_')

    return new Response(cloudinaryResponse.body, {
      status: 200,
      headers: {
        // Force octet-stream so browser always downloads — never tries to open inline
        // (application/pdf would cause browsers to render PDFs instead of downloading)
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
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
