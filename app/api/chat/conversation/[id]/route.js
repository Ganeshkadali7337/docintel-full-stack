// GET endpoint to load an existing conversation with its messages
// Used when user reopens a previous conversation

export const dynamic = 'force-dynamic'

import { getUserFromRequest } from '../../../../../lib/auth/middleware.js'
import { sendError, sendSuccess } from '../../../../../lib/utils/errorHandler.js'
import { getConversationByIdAndUserId } from '../../../../../lib/db/queries/conversations.js'
import { getMessagesByConversationId } from '../../../../../lib/db/queries/messages.js'

export async function GET(request, { params }) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return sendError(null, 'Unauthorized', 401)

    const conversation = await getConversationByIdAndUserId(params.id, user.userId)
    if (!conversation) return sendError(null, 'Conversation not found', 404)

    const messages = await getMessagesByConversationId(params.id)

    return sendSuccess(null, { conversation, messages })
  } catch (error) {
    return sendError(null, 'Failed to load conversation', 500)
  }
}
