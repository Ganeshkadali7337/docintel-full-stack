// File validation utility — checks that uploaded files meet our requirements
// Used both on the server (API route) and client (UploadZone component)

import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
} from './constants'

// Validate a file object before uploading or processing it
// Expects: { size, mimetype, originalFilename }
// Returns: { valid: true } or { valid: false, error: 'clear message' }
export function validateFile(file) {
  // Check the file was actually provided
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  // Check the file is not empty or corrupted
  if (!file.size || file.size === 0) {
    return { valid: false, error: 'File appears to be empty or corrupted' }
  }

  // Check MIME type is in our allowed list
  if (!ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload a PDF or DOCX file',
    }
  }

  // Check file extension (extra safety check alongside MIME type)
  const filename = file.originalFilename || ''
  const extension = filename.slice(filename.lastIndexOf('.')).toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: 'File type not supported. Please upload a PDF or DOCX file',
    }
  }

  // Check file size is within limit
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 10MB limit' }
  }

  return { valid: true }
}
