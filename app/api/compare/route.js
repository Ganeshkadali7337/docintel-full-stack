// Multi-document comparison API with streaming
// Queries each document separately then builds a comparison prompt

export const dynamic = 'force-dynamic'

import { getUserFromRequest } from '../../../lib/auth/middleware.js'
import { sendError } from '../../../lib/utils/errorHandler.js'
import { getDocumentByIdAndUserId } from '../../../lib/db/queries/documents.js'
import { generateEmbedding } from '../../../lib/services/embedder.js'
import { queryVectorsForMultipleDocs } from '../../../lib/services/vectordb.js'
import { buildComparePrompt, buildDirectPrompt, detectIntent, streamLLMResponse } from '../../../lib/services/llm.js'
import { createComparisonConversation, getConversationByIdAndUserId } from '../../../lib/db/queries/conversations.js'
import { createMessage, getMessagesByConversationId } from '../../../lib/db/queries/messages.js'
import { getChunksByIds } from '../../../lib/db/queries/chunks.js'

export async function POST(request) {
  try {
    // Step 1: Authenticate user
    const user = getUserFromRequest(request)
    if (!user) return sendError(null, 'Unauthorized', 401)

    // Step 2: Parse request body
    const { question, documentIds, conversationId } = await request.json()

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

    // Step 5: Get or create comparison conversation
    let conversation
    if (conversationId) {
      conversation = await getConversationByIdAndUserId(conversationId, user.userId)
      if (!conversation) return sendError(null, 'Conversation not found', 404)
    } else {
      conversation = await createComparisonConversation(user.userId, documentIds)
    }

    // Step 6: Load conversation history for follow-up support
    const conversationHistory = await getMessagesByConversationId(conversation.id)

    // Step 7: Save user question
    await createMessage(conversation.id, 'USER', question, null)

    // Step 7: Detect intent — skip RAG pipeline for general chat
    const intent = await detectIntent(question)

    let messages
    let docResultsWithNames = []

    if (intent === 'general_chat') {
      // General chat — respond directly without touching vectors or documents
      messages = buildDirectPrompt(question, conversationHistory)
    } else {
      // Step 8: Embed the question
      const questionEmbedding = await generateEmbedding(question)

      // Step 9: Query each document's vectors separately
      const docResults = await queryVectorsForMultipleDocs(
        questionEmbedding,
        documentIds,
        3
      )

      // Step 10: Fetch full chunk content from DB for all matched chunks
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

      // Step 11: Build comparison prompt with conversation history
      messages = buildComparePrompt(question, docResultsWithNames, conversationHistory)
    }

    // Step 12: Build source attribution from all matched chunks
    const sources = intent === 'general_chat' ? [] : docResultsWithNames.flatMap(result =>
      result.matches.map(match => ({
        chunkId: match.id,
        documentId: result.documentId,
        documentName: result.documentName,
        pageNumber: match.metadata?.pageNumber || null,
        contentPreview: match.metadata?.contentPreview || '',
      }))
    )

    // Step 13: Stream comparison response
    const stream = await streamLLMResponse(
      messages,
      async (fullResponse) => {
        await createMessage(conversation.id, 'ASSISTANT', fullResponse, sources.length > 0 ? sources : null)
      }
    )

    // Step 14: Return streaming response
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
