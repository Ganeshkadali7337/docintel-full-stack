// useDocuments hook — manages all document state and operations
// Handles fetching, multi-file uploading with per-file progress, polling, and deletion

'use client'

import { useState } from 'react'
import axios from 'axios'
import { usePolling } from './usePolling'
import { showSuccess, showError } from '../components/ui/Toast'

// Returns document state and functions to fetch, upload, and delete documents
// selectedIds and setSelectedIds are passed in from the page so deletion can
// deselect a document that's been removed
export function useDocuments(selectedIds, setSelectedIds) {
  const [documents, setDocuments]     = useState([])
  const [isLoading, setIsLoading]     = useState(false)
  const [uploadItems, setUploadItems] = useState([]) // { id, name, progress, stage }

  const { startPolling } = usePolling()

  // Helpers to update and remove a single item in uploadItems by its temp id
  function updateItem(itemId, patch) {
    setUploadItems(prev => prev.map(item => item.id === itemId ? { ...item, ...patch } : item))
  }
  function removeItem(itemId) {
    setUploadItems(prev => prev.filter(item => item.id !== itemId))
  }

  // Fetch all documents for the current user from the API
  async function fetchDocuments() {
    setIsLoading(true)
    try {
      const response = await axios.get('/api/documents')
      setDocuments(response.data?.data?.documents || [])
    } catch {
      showError('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }

  // Upload an array of files one by one — sequential loop
  // Each file gets its own progress entry in uploadItems
  async function uploadDocuments(files) {
    for (const file of files) {
      const itemId = `${Date.now()}-${Math.random()}`

      // Add this file to the progress list immediately
      setUploadItems(prev => [...prev, { id: itemId, name: file.name, progress: 0, stage: 'uploading' }])

      try {
        const formData = new FormData()
        formData.append('file', file)

        const response = await axios.post('/api/documents', formData, {
          onUploadProgress: (e) => {
            if (e.total) {
              const percent = Math.round((e.loaded / e.total) * 100)
              updateItem(itemId, { progress: percent })
            }
          },
        })

        const newDocument = response.data?.data?.document
        if (!newDocument) throw new Error('Upload response missing document data')

        // Add the document to the list immediately (status = PENDING)
        setDocuments(prev => [newDocument, ...prev])

        // Move to processing stage
        updateItem(itemId, { stage: 'processing' })

        // Wait for processing to complete before uploading the next file
        await new Promise((resolve) => {
          startPolling(newDocument.id, ({ status, errorMessage, pageCount }) => {
            setDocuments(prev =>
              prev.map(doc =>
                doc.id === newDocument.id
                  ? { ...doc, status, errorMessage, pageCount }
                  : doc
              )
            )

            if (status === 'READY') {
              showSuccess(`${file.name} is ready`)
              updateItem(itemId, { stage: 'done' })
              setTimeout(() => removeItem(itemId), 1500)
              resolve()
            } else if (status === 'FAILED') {
              showError(`Processing failed: ${errorMessage || 'Unknown error'}`)
              updateItem(itemId, { stage: 'error' })
              setTimeout(() => removeItem(itemId), 3000)
              resolve()
            }
          })
        })

      } catch (error) {
        const message = error.response?.data?.error || 'Upload failed'
        showError(`${file.name}: ${message}`)
        updateItem(itemId, { stage: 'error' })
        setTimeout(() => removeItem(itemId), 3000)
      }
    }
  }

  // Delete a document by ID — removes it from state and deselects if selected
  async function deleteDocument(documentId) {
    try {
      await axios.delete(`/api/documents/${documentId}`)

      setDocuments(prev => prev.filter(doc => doc.id !== documentId))

      if (selectedIds && setSelectedIds) {
        setSelectedIds(prev => prev.filter(id => id !== documentId))
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
    uploadItems,
    fetchDocuments,
    uploadDocuments,
    deleteDocument,
  }
}
