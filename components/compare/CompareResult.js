// Renders a comparison response with clear per-document sections
// Parses the assistant response and highlights each document's answer

import SourceAttribution from '../chat/SourceAttribution.js'

// Renders **bold** markdown inline without a library
function renderMarkdown(text) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export default function CompareResult({ content, sources }) {
  if (!content) return null

  return (
    <div className="compare-result">
      <div className="compare-content">
        {renderMarkdown(content)}
      </div>
      <SourceAttribution sources={sources} />
      <style>{`
        .compare-result {
          background: #18181b;
          border: 0.5px solid #27272a;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.6;
          color: #e4e4e7;
          white-space: pre-wrap;
          word-break: break-word;
          align-self: flex-start;
          max-width: 85%;
        }
        .compare-content strong {
          font-weight: 500;
          color: #f4f4f5;
        }
      `}</style>
    </div>
  )
}
