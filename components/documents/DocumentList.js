// DocumentList component — renders the list of documents or an empty state
// Shown in the Sidebar below the SearchFilter

import DocumentCard from './DocumentCard'
import EmptyState from '../ui/EmptyState'

// Render a list of document cards, or an empty state if there are none
export default function DocumentList({
  documents,
  selectedIds,
  onToggleSelect,
  onDelete,
}) {
  // Show empty state when there are no documents to display
  if (!documents || documents.length === 0) {
    return (
      <EmptyState
        title="No documents yet"
        subtitle="Upload a PDF or DOCX to get started"
      />
    )
  }

  return (
    <div className="flex flex-col">
      {documents.map((document) => (
        <DocumentCard
          key={document.id}
          document={document}
          isSelected={selectedIds.includes(document.id)}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
