// Main dashboard page — shows the sidebar and main content area
// Manages which documents are selected and wires everything together

'use client'

import { useState, useEffect } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import MainArea from '../../components/layout/MainArea'
import { useDocuments } from '../../hooks/useDocuments'
import { showError } from '../../components/ui/Toast'
import { MAX_SELECTED_DOCS } from '../../lib/utils/constants'

// Main dashboard — renders Sidebar (left) + MainArea (right) in a full-height row
export default function DashboardPage() {
  // Array of selected document IDs — used to show chat or comparison mode
  const [selectedIds, setSelectedIds] = useState([])

  // All document state and operations are managed in this hook
  const {
    documents,
    isLoading,
    uploadItems,
    fetchDocuments,
    uploadDocuments,
    deleteDocument,
  } = useDocuments(selectedIds, setSelectedIds)

  // Load documents when the page first mounts
  useEffect(() => {
    fetchDocuments()
  }, [])

  // Toggle selection for a document
  // Only READY documents can be selected
  function handleToggleSelect(documentId) {
    const document = documents.find((d) => d.id === documentId)

    // Don't allow selecting documents that aren't ready
    if (!document || document.status !== 'READY') {
      showError('Document is still processing')
      return
    }

    if (selectedIds.includes(documentId)) {
      // Deselect if already selected
      setSelectedIds((previousIds) => previousIds.filter((id) => id !== documentId))
    } else {
      // Don't allow more than MAX_SELECTED_DOCS
      if (selectedIds.length >= MAX_SELECTED_DOCS) {
        showError('Maximum 3 documents can be selected')
        return
      }
      setSelectedIds((previousIds) => [...previousIds, documentId])
    }
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar: upload, search, and document list */}
      <Sidebar
        documents={documents}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onDelete={deleteDocument}
        onUpload={uploadDocuments}
        uploadItems={uploadItems}
      />

      {/* Right main area: chat or comparison interface (Parts 3 and 4) */}
      <MainArea
        selectedIds={selectedIds}
        documents={documents}
      />
    </div>
  )
}
