// useFilter hook — filters the document list by search term and status
// Pure frontend filtering — no API calls, instant results

'use client'

import { useState } from 'react'

// Returns filtered documents and the controls to change the filter
// documents: the full array of documents from useDocuments
export function useFilter(documents) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Filter the documents array based on current search and status values
  const filteredDocuments = (documents || []).filter((document) => {
    // Check if the filename contains the search term (case insensitive)
    const matchesSearch = document.originalName
      .toLowerCase()
      .includes(search.toLowerCase())

    // Check if the document's status matches the selected filter
    const matchesStatus =
      statusFilter === 'ALL' || document.status === statusFilter

    return matchesSearch && matchesStatus
  })

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredDocuments,
  }
}
