// Single document Q&A API with streaming
// Flow (general chat): intent detect -> direct GPT-4o stream
// Flow (document Q&A): intent detect -> embed -> search Pinecone -> RAG prompt -> stream

import { getUserFromRequest } from "../../../lib/auth/middleware.js";
import { sendError } from "../../../lib/utils/errorHandler.js";
import { getDocumentByIdAndUserId } from "../../../lib/db/queries/documents.js";
import { generateEmbedding } from "../../../lib/services/embedder.js";
import { queryVectors } from "../../../lib/services/vectordb.js";
import {
  buildRAGPrompt,
  buildDirectPrompt,
  detectIntent,
  streamLLMResponse,
} from "../../../lib/services/llm.js";
import {
  createSingleConversation,
  getConversationByIdAndUserId,
} from "../../../lib/db/queries/conversations.js";
import {
  createMessage,
  getMessagesByConversationId,
} from "../../../lib/db/queries/messages.js";
import { getChunksByIds } from "../../../lib/db/queries/chunks.js";

export async function POST(request) {
  try {
    // Step 1: Authenticate user
    const user = getUserFromRequest(request);
    if (!user) return sendError(null, "Unauthorized", 401);

    // Step 2: Parse request body
    const { question, documentId, conversationId } = await request.json();

    // Step 3: Validate inputs
    if (!question || !question.trim()) {
      return sendError(null, "Question is required", 400);
    }
    if (!documentId) {
      return sendError(null, "Document ID is required", 400);
    }

    // Step 4: Verify document belongs to user and is READY
    const document = await getDocumentByIdAndUserId(documentId, user.userId);
    if (!document) {
      return sendError(null, "Document not found", 404);
    }
    if (document.status !== "READY") {
      return sendError(null, "Document is still processing. Please wait.", 400);
    }

    // Step 5: Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await getConversationByIdAndUserId(
        conversationId,
        user.userId,
      );
      if (!conversation) {
        return sendError(null, "Conversation not found", 404);
      }
    } else {
      conversation = await createSingleConversation(user.userId, documentId);
    }

    // Step 6: Get conversation history for follow-up support
    const conversationHistory = await getMessagesByConversationId(
      conversation.id,
    );

    // Step 7: Save user message to DB
    await createMessage(conversation.id, "USER", question, null);

    // Step 8: Detect intent — general_chat skips embedding + Pinecone entirely
    const intent = await detectIntent(question);

    let messages;
    let sources = [];

    if (intent === "general_chat") {
      // General chat — build a lightweight prompt, no RAG needed
      messages = buildDirectPrompt(question, conversationHistory);
    } else {
      // Step 9: Embed the question
      const questionEmbedding = await generateEmbedding(question);

      // Step 10: Search Pinecone for relevant chunks
      const relevantChunks = await queryVectors(questionEmbedding, documentId);

      // Step 11: Fetch full chunk content from DB — Pinecone only stores a short preview
      const chunkIds = relevantChunks.map((c) => c.id);
      const dbChunks = await getChunksByIds(chunkIds);

      // Merge Pinecone metadata (pageNumber, score) with full DB content
      const chunksWithFullContent = relevantChunks.map((match) => {
        const dbChunk = dbChunks.find((c) => c.id === match.id);
        return {
          ...match,
          metadata: {
            ...match.metadata,
            contentPreview: dbChunk?.content || match.metadata?.contentPreview || "",
          },
        };
      });

      // Step 12: Build RAG prompt with full content chunks and history
      messages = buildRAGPrompt(question, chunksWithFullContent, conversationHistory);

      // Step 13: Build source attribution data
      sources = relevantChunks.map((match) => ({
        chunkId: match.id,
        documentId: documentId,
        documentName: document.originalName,
        pageNumber: match.metadata?.pageNumber || null,
        contentPreview: match.metadata?.contentPreview || "",
      }));
    }

    // Step 14: Stream GPT-4o response
    const stream = await streamLLMResponse(messages, async (fullResponse) => {
      await createMessage(conversation.id, "ASSISTANT", fullResponse, sources);
    });

    // Step 15: Return streaming response with conversation ID
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Conversation-Id": conversation.id,
      },
    });
  } catch (error) {
    console.error("[chat/route] ERROR:", error.message);
    return sendError(null, "Failed to process question", 500);
  }
}
