// Database queries for chat messages
// Each message belongs to a conversation and has a role (USER/ASSISTANT)

import { prisma } from '../client.js'

// Save a new message to a conversation
// sources is optional JSON array of chunk references
export async function createMessage(conversationId, role, content, sources) {
  return await prisma.message.create({
    data: {
      conversationId,
      role,
      content,
      sources: sources || null
    }
  })
}

// Get all messages in a conversation ordered by time
export async function getMessagesByConversationId(conversationId) {
  return await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' }
  })
}
