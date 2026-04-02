// Shows which page/section of the document(s) answered the question
// Displayed below each assistant message
// For single-doc: shows "Page X" badges
// For multi-doc comparison: shows "DocName · Page X" badges

export default function SourceAttribution({ sources }) {
  if (!sources || sources.length === 0) return null

  const isMultiDoc = new Set(sources.map(s => s.documentId).filter(Boolean)).size > 1

  if (isMultiDoc) {
    // Deduplicate by (documentId, pageNumber) pair
    const seen = new Set()
    const uniqueSources = sources.filter(s => {
      if (!s.pageNumber) return false
      const key = `${s.documentId}:${s.pageNumber}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    if (uniqueSources.length === 0) return null

    return (
      <div className="source-attribution">
        <span className="source-label">Sources: </span>
        {uniqueSources.map((s, i) => (
          <span key={i} className="source-badge">
            {s.documentName} · Page {s.pageNumber}
          </span>
        ))}
        <style>{styles}</style>
      </div>
    )
  }

  // Single-doc: deduplicate by page number only
  const uniquePages = [...new Set(
    sources.filter(s => s.pageNumber).map(s => s.pageNumber)
  )]

  if (uniquePages.length === 0) return null

  return (
    <div className="source-attribution">
      <span className="source-label">Sources: </span>
      {uniquePages.map(page => (
        <span key={page} className="source-badge">
          Page {page}
        </span>
      ))}
      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .source-attribution {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
  }
  .source-label {
    font-size: 11px;
    color: #71717a;
  }
  .source-badge {
    font-size: 11px;
    padding: 1px 8px;
    border: 0.5px solid #3f3f46;
    border-radius: 99px;
    color: #a1a1aa;
    background: #27272a;
  }
`
