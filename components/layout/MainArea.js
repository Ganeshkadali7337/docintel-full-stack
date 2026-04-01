// MainArea — right content panel — dark theme
// TODO Part 3: render ChatWindow when 1 doc selected
// TODO Part 4: render CompareWindow when 2-3 docs selected

import EmptyState from '../ui/EmptyState'

export default function MainArea({ selectedIds, documents }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#09090b]">
      <EmptyState
        title="Select a document to get started"
        subtitle="Choose a document from the sidebar to start chatting, or select multiple to compare them."
      />
    </div>
  )
}
