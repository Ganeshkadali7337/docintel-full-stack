// GET /api/documents/[id]/conversations
// Returns all conversations for a document (newest first)
// Each conversation includes the first message as a preview

export const dynamic = 'force-dynamic'

import { getUserFromRequest } from '../../../../../lib/auth/middleware.js'
import { sendError, sendSuccess } from '../../../../../lib/utils/errorHandler.js'
import { getConversationsByDocumentId } from '../../../../../lib/db/queries/conversations.js'

export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return sendError(null, 'Unauthorized', 401)

    const conversations = await getConversationsByDocumentId(params.id, user.userId)

    return sendSuccess(null, { conversations })
  } catch (error) {
    console.error('[conversations/route] ERROR:', error.message)
    return sendError(null, 'Failed to load conversations', 500)
  }
}
