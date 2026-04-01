// DocumentCard — single document row with checkbox, info, delete — dark theme

'use client'

import { useState } from 'react'
import StatusBadge from './StatusBadge'
import DeleteConfirmModal from './DeleteConfirmModal'

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function DocumentCard({
  document,
  isSelected,
  onToggleSelect,
  onDelete,
}) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  async function handleConfirmDelete() {
    setIsDeleting(true)
    await onDelete(document.id)
    setIsDeleting(false)
    setIsDeleteModalOpen(false)
  }

  return (
    <>
      <div
        className={`
          flex items-start gap-3 px-3 py-3 border-b border-zinc-800 transition-colors
          ${isSelected ? 'bg-zinc-800' : 'bg-[#18181b] hover:bg-zinc-800/50'}
        `}
      >
        {/* Checkbox — only enabled when READY */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(document.id)}
          disabled={document.status !== 'READY'}
          className="mt-0.5 h-3.5 w-3.5 cursor-pointer disabled:cursor-not-allowed accent-white"
          // TODO Part 3: Add onClick to navigate to single doc chat
        />

        {/* Document info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-zinc-200 truncate">
            {document.originalName}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <StatusBadge status={document.status} />
            {document.pageCount && (
              <span className="text-xs text-zinc-600">{document.pageCount} pages</span>
            )}
            <span className="text-xs text-zinc-600">{formatDate(document.createdAt)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {/* Download button — temporarily disabled */}
          {/* <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-zinc-700 hover:text-zinc-300 transition-colors disabled:opacity-40"
            aria-label="Download document"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button> */}

          {/* Delete button */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-zinc-700 hover:text-red-400 text-xs transition-colors"
            aria-label="Delete document"
          >
            ✕
          </button>
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        documentName={document.originalName}
        isDeleting={isDeleting}
      />
    </>
  )
}
