// Sidebar — upload zone, per-file progress list, search, document list, selection hint
// On mobile: collapsible drawer using absolute positioning (scoped to the content area below navbar)

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
  onRetry,
  onUpload,
  uploadItems,
  isLoading,
  isMobileOpen,
  onMobileClose,
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

  // ─── Shared panel content (used by both desktop + mobile drawer) ────────────
  const panelContent = (
    <>
      {/* Upload zone */}
      <div className="p-3 border-b border-zinc-800 flex flex-col gap-2">
        <UploadZone onUpload={onUpload} isDisabled={false} />
        {uploadItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {uploadItems.map(item => (
              <UploadProgress
                key={item.id}
                filename={item.name}
                uploadProgress={item.progress}
                stage={item.stage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Search + filter */}
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
          onRetry={onRetry}
          isLoading={isLoading}
        />
      </div>

      {/* Selection hint */}
      <div className="p-3 border-t border-zinc-800">
        <p className={`text-xs text-center ${hint.color}`}>{hint.text}</p>
      </div>
    </>
  )

  return (
    <>
      {/* ── DESKTOP: static sidebar in the flex row (always visible ≥ md) ── */}
      <div className="hidden md:flex flex-col w-64 shrink-0 border-r border-zinc-800 bg-[#18181b] h-full">
        {panelContent}
      </div>

      {/* ── MOBILE: absolute drawer scoped to the content area (already below navbar) ── */}

      {/* Backdrop — covers entire content area when drawer is open */}
      {isMobileOpen && (
        <div
          className="md:hidden absolute inset-0 bg-black/60 z-40"
          onClick={onMobileClose}
        />
      )}

      {/* Drawer panel — slides in from the left within the content area */}
      <div
        className="md:hidden absolute top-0 left-0 bottom-0 w-64 z-50 flex flex-col bg-[#18181b] border-r border-zinc-800 transition-transform duration-300 ease-in-out"
        style={{ transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {/* Mobile-only header row with close button */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
          <span className="text-sm font-semibold text-zinc-300">Documents</span>
          <button
            onClick={onMobileClose}
            className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-white hover:bg-zinc-700/60 transition-colors"
            aria-label="Close sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {panelContent}
      </div>
    </>
  )
}
