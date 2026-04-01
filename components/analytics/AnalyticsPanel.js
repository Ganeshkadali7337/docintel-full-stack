// Analytics panel — shows real usage stats for selected document(s)
// All data is fetched live from the DB — no dummy values

'use client'
import { useEffect, useState } from 'react'

// Format a dollar amount — show at least 4 decimal places for small amounts
function formatCost(usd) {
  if (usd === 0) return '$0.00'
  if (usd < 0.001) return `$${usd.toFixed(6)}`
  if (usd < 0.01)  return `$${usd.toFixed(4)}`
  return `$${usd.toFixed(4)}`
}

// Format large numbers with commas
function fmt(n) {
  return (n || 0).toLocaleString()
}

// A single labeled stat row
function Row({ label, value }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

// A titled section card
function Section({ title, children }) {
  return (
    <div className="section">
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

export default function AnalyticsPanel({ selectedDocuments }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const documentIds = selectedDocuments.map(d => d.id)
  const key         = documentIds.join(',')

  useEffect(() => {
    if (documentIds.length === 0) return

    setLoading(true)
    setError(null)

    fetch(`/api/analytics?documentIds=${key}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) setData(json.data)
        else setError('Failed to load analytics')
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [key])

  return (
    <div className="analytics-panel">

      {loading && (
        <div className="analytics-loading">Loading analytics...</div>
      )}

      {error && (
        <div className="analytics-error">{error}</div>
      )}

      {!loading && !error && !data && (
        <div className="analytics-loading">No data yet.</div>
      )}

      {!loading && data && (
        <>
          {/* Per-document breakdown */}
          {data.documents.map(doc => (
            <Section key={doc.id} title={doc.name}>
              <Row label="Pages"           value={fmt(doc.pageCount)} />
              <Row label="Text chunks"     value={fmt(doc.chunkCount)} />
              <Row label="Document tokens" value={fmt(doc.documentTokens)} />
            </Section>
          ))}

          {/* Conversation activity */}
          <Section title="Conversation Activity">
            <Row label="Conversations"    value={fmt(data.conversations.total)} />
            <Row label="Questions asked"  value={fmt(data.conversations.questionsAsked)} />
            <Row label="Messages total"   value={fmt(data.conversations.totalMessages)} />
          </Section>

          {/* Token usage */}
          <Section title="Token Usage">
            <Row label="Input tokens"     value={fmt(data.tokens.inputTokens)} />
            <Row label="Output tokens"    value={fmt(data.tokens.outputTokens)} />
            <Row label="Embedding tokens" value={fmt(data.tokens.embeddingTokens)} />
          </Section>

          {/* Cost breakdown */}
          <Section title="Estimated Cost">
            <Row label="GPT-4o input"    value={formatCost(data.cost.input)} />
            <Row label="GPT-4o output"   value={formatCost(data.cost.output)} />
            <Row label="Embeddings"      value={formatCost(data.cost.embedding)} />
            <div className="cost-total">
              <span>Total</span>
              <span>{formatCost(data.cost.total)}</span>
            </div>
          </Section>

          <div className="analytics-note">
            Token counts are estimated. Cost based on GPT-4o ($2.50/$10 per 1M) and
            text-embedding-3-small ($0.02 per 1M) pricing.
          </div>
        </>
      )}

      <style>{`
        .analytics-panel {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          background: #09090b;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .analytics-loading,
        .analytics-error {
          font-size: 13px;
          color: #71717a;
          margin-top: 12px;
        }
        .analytics-error { color: #f87171; }
        .section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #71717a;
          padding-bottom: 6px;
          border-bottom: 0.5px solid #27272a;
        }
        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .stat-label { color: #a1a1aa; }
        .stat-value {
          color: #f4f4f5;
          font-variant-numeric: tabular-nums;
        }
        .cost-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 500;
          color: #f4f4f5;
          border-top: 0.5px solid #27272a;
          padding-top: 8px;
          margin-top: 2px;
        }
        .analytics-note {
          font-size: 11px;
          color: #52525b;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}
