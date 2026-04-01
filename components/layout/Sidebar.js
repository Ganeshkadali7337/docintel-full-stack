// Sidebar — upload zone, search, document list, selection hint — dark theme

'use client'

import UploadZone from '../documents/UploadZone'
import UploadProgress from '../documents/UploadProgress'
import SearchFilter from '../documents/SearchFilter'
import DocumentList from '../documents/DocumentList'
import { useFilter } from '../../hooks/useFilter'
import { MAX_SELECTED_DOCS } from '../../lib/utils/constants'

export default function Sidebar({
  documents,
  selectedIds,
  onToggleSelect,
  onDelete,
  onUpload,
  isUploading,
  uploadProgress,
  uploadingFile,
}) {
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredDocuments,
  } = useFilter(documents)

  function getSelectionHint() {
    const count = selectedIds.length
    if (count === 0) return { text: 'Select a document to chat', color: 'text-zinc-600' }
    if (count === 1) return { text: '1 document selected — chat mode', color: 'text-zinc-400' }
    if (count <= MAX_SELECTED_DOCS)
      return { text: `${count} documents selected — comparison mode`, color: 'text-zinc-400' }
    return { text: 'Maximum 3 documents allowed', color: 'text-red-500' }
  }

  const hint = getSelectionHint()

  return (
    <div className="w-64 shrink-0 border-r border-zinc-800 bg-[#18181b] flex flex-col h-full">
      {/* Upload zone or progress */}
      <div className="p-3 border-b border-zinc-800">
        {isUploading ? (
          <UploadProgress
            filename={uploadingFile || 'Uploading...'}
            uploadProgress={uploadProgress}
            stage={uploadProgress < 100 ? 'uploading' : 'processing'}
          />
        ) : (
          <UploadZone onUpload={onUpload} isUploading={isUploading} />
        )}
      </div>

      {/* Search and filter */}
      <div className="border-b border-zinc-800">
        <SearchFilter
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        <DocumentList
          documents={filteredDocuments}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
        />
      </div>

      {/* Selection hint */}
      <div className="p-3 border-t border-zinc-800">
        <p className={`text-xs text-center ${hint.color}`}>{hint.text}</p>
      </div>
    </div>
  )
}
