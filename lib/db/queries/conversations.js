// Database queries for conversations
// A conversation belongs to a user and links to one or more documents

import { prisma } from '../client.js'

// Create a new single-document conversation
export async function createSingleConversation(userId, documentId) {
  return await prisma.conversation.create({
    data: {
      userId,
      type: 'SINGLE',
      conversationDocuments: {
        create: { documentId }
      }
    },
    include: {
      conversationDocuments: true
    }
  })
}

// Create a new comparison conversation linked to multiple documents
export async function createComparisonConversation(userId, documentIds) {
  return await prisma.conversation.create({
    data: {
      userId,
      type: 'COMPARISON',
      conversationDocuments: {
        create: documentIds.map(documentId => ({ documentId }))
      }
    },
    include: {
      conversationDocuments: true
    }
  })
}

// Get a conversation by ID (with ownership check)
export async function getConversationByIdAndUserId(id, userId) {
  return await prisma.conversation.findFirst({
    where: { id, userId },
    include: {
      conversationDocuments: {
        include: { document: true }
      }
    }
  })
}

// Get all conversations for a specific document
// Returns both SINGLE and COMPARISON conversations that include this doc
export async function getConversationsByDocumentId(documentId, userId) {
  return await prisma.conversation.findMany({
    where: {
      userId,
      conversationDocuments: {
        some: { documentId }
      }
    },
    include: {
      conversationDocuments: {
        include: {
          document: {
            select: { id: true, originalName: true }
          }
        }
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 1
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}
