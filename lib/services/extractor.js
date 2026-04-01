// Text extraction service — pulls raw text from PDF and DOCX files
// Never throws — always returns { text, pageCount, error }

import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

// Extract text from a file buffer based on its MIME type
// Returns { text, pageCount, error } — error is null on success
export async function extractText(buffer, mimetype) {
  try {
    if (mimetype === 'application/pdf') {
      return await extractFromPDF(buffer)
    }
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await extractFromDOCX(buffer)
    }
    return { text: null, pageCount: null, error: 'Unsupported file type' }
  } catch (error) {
    return { text: null, pageCount: null, error: error.message }
  }
}

// Extract text from a PDF buffer using pdf-parse
// Returns { text, pageCount, error }
async function extractFromPDF(buffer) {
  try {
    const result = await pdfParse(buffer)
    const text = result.text.trim()

    // Reject documents that have no readable text (e.g. scanned image PDFs)
    if (!text || text.length < 50) {
      return {
        text: null,
        pageCount: result.numpages,
        error: 'Document appears to be empty or contains only images. Please upload a text-based PDF.'
      }
    }

    return { text, pageCount: result.numpages, error: null }
  } catch (error) {
    return { text: null, pageCount: null, error: `Failed to read PDF: ${error.message}` }
  }
}

// Extract text from a DOCX buffer using mammoth
// Returns { text, pageCount, error }
// Note: DOCX has no real page count — we estimate from word count
async function extractFromDOCX(buffer) {
  try {
    // extractRawText gives clean plain text without HTML markup
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value.trim()

    if (!text || text.length < 50) {
      return {
        text: null,
        pageCount: null,
        error: 'Document appears to be empty or contains no readable text.'
      }
    }

    // Estimate page count — roughly 300 words per page
    const wordCount = text.split(/\s+/).length
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 300))

    // Log mammoth warnings but don't fail — partial extraction is fine
    if (result.messages && result.messages.length > 0) {
      console.log('Mammoth warnings (non-fatal):', result.messages)
    }

    return { text, pageCount: estimatedPages, error: null }
  } catch (error) {
    return { text: null, pageCount: null, error: `Failed to read DOCX: ${error.message}` }
  }
}
