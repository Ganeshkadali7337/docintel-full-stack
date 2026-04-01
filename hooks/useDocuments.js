// useDocuments hook — manages all document state and operations
// Handles fetching, uploading (with progress), polling, and deletion

'use client'

import { useState } from 'react'
import axios from 'axios'
import { usePolling } from './usePolling'
import { showSuccess, showError } from '../components/ui/Toast'

// Returns document state and functions to fetch, upload, and delete documents
// selectedIds and setSelectedIds are passed in from the page so deletion can
// deselect a document that's been removed
export function useDocuments(selectedIds, setSelectedIds) {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingFile, setUploadingFile] = useState(null)

  const { startPolling } = usePolling()

  // Fetch all documents for the current user from the API
  async function fetchDocuments() {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/documents')
      setDocuments(response.data?.data?.documents || [])
    } catch (error) {
      showError('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  // Upload a file, track progress, then poll for processing status
  async function uploadDocument(file) {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadingFile(file.name)

    try {
      // Build multipart form data with the file
      const formData = new FormData()
      formData.append('file', file)

      // POST to the upload endpoint, tracking upload progress
      const response = await axios.post('/api/documents', formData, {
        onUploadProgress: (progressEvent) => {
          // progressEvent.total may be undefined in some browsers
          if (progressEvent.total) {
            const percent = Math.round(
              (progressEvent.loaded / progressEvent.total) * 100
            )
            setUploadProgress(percent)
          }
        },
      })

      const newDocument = response.data?.data?.document
      if (!newDocument) {
        throw new Error('Upload response missing document data')
      }

      // Add the new document to the list immediately (status = PENDING)
      setDocuments((previousDocuments) => [newDocument, ...previousDocuments])

      // Start polling to track when the document finishes processing
      startPolling(newDocument.id, ({ status, errorMessage, pageCount }) => {
        // Update this specific document's status in the list
        setDocuments((previousDocuments) =>
          previousDocuments.map((document) =>
            document.id === newDocument.id
              ? { ...document, status, errorMessage, pageCount }
              : document
          )
        )

        // When processing completes, show a toast and stop the upload state
        if (status === 'READY') {
          showSuccess(`${file.name} is ready`)
          setIsUploading(false)
          setUploadingFile(null)
        } else if (status === 'FAILED') {
          showError(`Processing failed: ${errorMessage || 'Unknown error'}`)
          setIsUploading(false)
          setUploadingFile(null)
        }
      })

      // Upload itself succeeded — note: processing continues via polling above
      // We keep isUploading=true until polling finishes so UploadProgress stays visible
    } catch (error) {
      const message = error.response?.data?.error || 'Upload failed'
      showError(message)
      setIsUploading(false)
      setUploadingFile(null)
    }
  }

  // Delete a document by ID — removes it from state and deselects if selected
  async function deleteDocument(documentId) {
    try {
      await axios.delete(`/api/documents/${documentId}`)

      // Remove the document from the list
      setDocuments((previousDocuments) =>
        previousDocuments.filter((document) => document.id !== documentId)
      )

      // If the deleted document was selected, deselect it
      if (selectedIds && setSelectedIds) {
        setSelectedIds((previousIds) =>
          previousIds.filter((id) => id !== documentId)
        )
      }

      showSuccess('Document deleted')
    } catch (error) {
      const message = error.response?.data?.error || 'Delete failed'
      showError(message)
    }
  }

  return {
    documents,
    isLoading,
    isUploading,
    uploadProgress,
    uploadingFile,
    fetchDocuments,
    uploadDocument,
    deleteDocument,
  }
}
