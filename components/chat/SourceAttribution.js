// Shows which page/section of the document answered the question
// Displayed below each assistant message

export default function SourceAttribution({ sources }) {
  // Don't render if no sources provided
  if (!sources || sources.length === 0) return null

  // Deduplicate by page number
  const uniquePages = [...new Set(
    sources
      .filter(s => s.pageNumber)
      .map(s => s.pageNumber)
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
      <style>{`
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
      `}</style>
    </div>
  )
}
