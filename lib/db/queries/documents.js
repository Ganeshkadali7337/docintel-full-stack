// Database query functions for the Document table
// All document-related DB operations go here — keeps API routes clean

import { prisma } from '../client'

// Create a new document record after a successful file upload
export async function createDocument(
  userId,
  filename,
  originalName,
  fileSize,
  cloudinaryUrl,
  cloudinaryPublicId
) {
  return await prisma.document.create({
    data: {
      userId,
      filename,
      originalName,
      fileSize,
      cloudinaryUrl,
      cloudinaryPublicId,
      // status defaults to PENDING (set in schema)
    },
  })
}

// Get all documents belonging to a specific user, newest first
export async function getDocumentsByUserId(userId) {
  return await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

// Get a single document by its ID (no user ownership check)
// Only use this in internal/server logic — not in user-facing API routes
export async function getDocumentById(id) {
  return await prisma.document.findUnique({
    where: { id },
  })
}

// Get a document by ID only if it belongs to the given user
// Always use this in user-facing API routes to prevent unauthorized access
export async function getDocumentByIdAndUserId(id, userId) {
  return await prisma.document.findFirst({
    where: { id, userId },
  })
}

// Update the processing status of a document
// Used in Part 2 after text extraction and embedding
export async function updateDocumentStatus(id, status, errorMessage = null) {
  return await prisma.document.update({
    where: { id },
    data: { status, errorMessage },
  })
}

// Update the page count of a document after extraction
// Used in Part 2 after PDF/DOCX parsing
export async function updateDocumentPageCount(id, pageCount) {
  return await prisma.document.update({
    where: { id },
    data: { pageCount },
  })
}

// Delete a document and all related data (chunks, conversation links)
// Prisma cascades will handle related records via onDelete: Cascade in schema
export async function deleteDocument(id) {
  return await prisma.document.delete({
    where: { id },
  })
}
