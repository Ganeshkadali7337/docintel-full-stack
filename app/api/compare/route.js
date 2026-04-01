// Multi-document comparison API with streaming
// Queries each document separately then builds a comparison prompt

import { getUserFromRequest } from '../../../lib/auth/middleware.js'
import { sendError } from '../../../lib/utils/errorHandler.js'
import { getDocumentByIdAndUserId } from '../../../lib/db/queries/documents.js'
import { generateEmbedding } from '../../../lib/services/embedder.js'
import { queryVectorsForMultipleDocs } from '../../../lib/services/vectordb.js'
import { buildComparePrompt, streamLLMResponse } from '../../../lib/services/llm.js'
import { createComparisonConversation } from '../../../lib/db/queries/conversations.js'
import { createMessage } from '../../../lib/db/queries/messages.js'
import { getChunksByIds } from '../../../lib/db/queries/chunks.js'

export async function POST(request) {
  try {
    // Step 1: Authenticate user
    const user = getUserFromRequest(request)
    if (!user) return sendError(null, 'Unauthorized', 401)

    // Step 2: Parse request body
    const { question, documentIds } = await request.json()

    // Step 3: Validate inputs
    if (!question || !question.trim()) {
      return sendError(null, 'Question is required', 400)
    }
    if (!documentIds || documentIds.length < 2) {
      return sendError(null, 'Select at least 2 documents to compare', 400)
    }
    if (documentIds.length > 3) {
      return sendError(null, 'Maximum 3 documents can be compared at once', 400)
    }

    // Step 4: Verify all documents belong to user and are READY
    const documents = await Promise.all(
      documentIds.map(id => getDocumentByIdAndUserId(id, user.userId))
    )

    if (documents.includes(null)) {
      return sendError(null, 'One or more documents not found', 404)
    }

    const notReadyDoc = documents.find(doc => doc.status !== 'READY')
    if (notReadyDoc) {
      return sendError(
        null,
        `Document "${notReadyDoc.originalName}" is not ready yet`,
        400
      )
    }

    // Step 5: Create comparison conversation
    const conversation = await createComparisonConversation(user.userId, documentIds)

    // Step 6: Save user question
    await createMessage(conversation.id, 'USER', question, null)

    // Step 7: Embed the question
    const questionEmbedding = await generateEmbedding(question)

    // Step 8: Query each document's vectors separately
    const docResults = await queryVectorsForMultipleDocs(
      questionEmbedding,
      documentIds,
      3
    )

    // Step 9: Fetch full chunk content from DB for all matched chunks
    const allChunkIds = docResults.flatMap(r => r.matches.map(m => m.id))
    const dbChunks = await getChunksByIds(allChunkIds)

    // Add document names and merge full DB content into matches
    const docResultsWithNames = docResults.map(result => ({
      ...result,
      documentName:
        documents.find(d => d.id === result.documentId)?.originalName ||
        result.documentId,
      matches: result.matches.map(match => {
        const dbChunk = dbChunks.find(c => c.id === match.id)
        return {
          ...match,
          metadata: {
            ...match.metadata,
            contentPreview: dbChunk?.content || match.metadata?.contentPreview || '',
          },
        }
      }),
    }))

    // Step 10: Build comparison prompt
    const messages = buildComparePrompt(question, docResultsWithNames)

    // Step 11: Stream comparison response
    const stream = await streamLLMResponse(
      messages,
      async (fullResponse) => {
        await createMessage(conversation.id, 'ASSISTANT', fullResponse, null)
      }
    )

    // Step 12: Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Conversation-Id': conversation.id
      }
    })

  } catch (error) {
    console.error('Compare API error:', error.message)
    return sendError(null, 'Failed to process comparison', 500)
  }
}
