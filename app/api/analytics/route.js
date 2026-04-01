// Analytics API — returns real usage stats for selected document(s)
// GET /api/analytics?documentIds=id1,id2

export const dynamic = 'force-dynamic'

import { getUserFromRequest } from '../../../lib/auth/middleware.js'
import { sendError, sendSuccess } from '../../../lib/utils/errorHandler.js'
import { prisma } from '../../../lib/db/client.js'

// Rough token estimate from text — 4 chars ≈ 1 token (standard approximation)
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4)
}

// GPT-4o pricing per token (as of 2025)
const GPT4O_INPUT_COST  = 2.50  / 1_000_000   // $2.50 per 1M input tokens
const GPT4O_OUTPUT_COST = 10.00 / 1_000_000   // $10.00 per 1M output tokens
const EMBED_COST        = 0.02  / 1_000_000   // $0.02 per 1M embedding tokens

export async function GET(request) {
  try {
    const user = getUserFromRequest(request)
    if (!user) return sendError(null, 'Unauthorized', 401)

    const { searchParams } = new URL(request.url)
    const raw = searchParams.get('documentIds') || ''
    const documentIds = raw.split(',').filter(Boolean)

    if (documentIds.length === 0) {
      return sendError(null, 'documentIds query param is required', 400)
    }

    // Fetch documents with their chunks — verify ownership
    const documents = await prisma.document.findMany({
      where: { id: { in: documentIds }, userId: user.userId },
      include: {
        chunks: { select: { tokenCount: true } }
      }
    })

    if (documents.length === 0) {
      return sendError(null, 'Documents not found', 404)
    }

    // Per-document stats
    const docStats = documents.map(doc => ({
      id: doc.id,
      name: doc.originalName,
      pageCount: doc.pageCount || 0,
      chunkCount: doc.chunks.length,
      // Exact token count stored at chunk-creation time (from tiktoken)
      documentTokens: doc.chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0)
    }))

    // Fetch all conversations that include any of these documents
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: user.userId,
        conversationDocuments: { some: { documentId: { in: documentIds } } }
      },
      include: {
        messages: { select: { role: true, content: true } }
      }
    })

    // Aggregate message stats across all conversations
    let questionsAsked = 0
    let inputTokens    = 0
    let outputTokens   = 0

    for (const convo of conversations) {
      for (const msg of convo.messages) {
        const tokens = estimateTokens(msg.content)
        if (msg.role === 'USER') {
          questionsAsked++
          inputTokens += tokens
        } else {
          outputTokens += tokens
        }
      }
    }

    // Embedding tokens = total document tokens processed during Part 2
    const embeddingTokens = docStats.reduce((sum, d) => sum + d.documentTokens, 0)

    // Cost estimates
    const inputCost     = inputTokens    * GPT4O_INPUT_COST
    const outputCost    = outputTokens   * GPT4O_OUTPUT_COST
    const embeddingCost = embeddingTokens * EMBED_COST
    const totalCost     = inputCost + outputCost + embeddingCost

    return sendSuccess(null, {
      documents: docStats,
      conversations: {
        total:             conversations.length,
        questionsAsked,
        totalMessages:     conversations.reduce((s, c) => s + c.messages.length, 0)
      },
      tokens: {
        inputTokens,
        outputTokens,
        embeddingTokens
      },
      cost: {
        input:     inputCost,
        output:    outputCost,
        embedding: embeddingCost,
        total:     totalCost
      }
    })

  } catch (error) {
    console.error('Analytics error:', error.message)
    return sendError(null, 'Failed to load analytics', 500)
  }
}
