// ConversationHistory — shows past conversations for selected document(s)
// Single doc: lists all conversations for that doc
// Multi-doc: lists conversations per document in separate sections

'use client'
import { useState, useEffect } from 'react'
import MessageBubble from './MessageBubble.js'
import CompareResult from '../compare/CompareResult.js'

// ─── PDF helpers ────────────────────────────────────────────────────────────

function buildPDFEngine(jsPDF) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const ML = 48          // left margin
  const MR = 48          // right margin
  const contentW = pageW - ML - MR
  let y = ML

  function newPage() { doc.addPage(); y = 56 }

  function checkBreak(needed) {
    if (y + needed > pageH - 48) newPage()
  }

  function coverHeader(title, subtitle) {
    // Dark top bar
    doc.setFillColor(9, 9, 11)
    doc.rect(0, 0, pageW, 80, 'F')
    // Accent line
    doc.setFillColor(99, 102, 241)  // indigo
    doc.rect(0, 80, pageW, 3, 'F')

    // App name
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(99, 102, 241)
    doc.text('DOCINTEL', ML, 28)

    // Title
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(244, 244, 245)
    doc.text(title, ML, 52)

    // Subtitle
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(113, 113, 122)
    doc.text(subtitle, ML, 68)

    y = 104
  }

  function conversationHeader(conversation) {
    const isComparison = conversation.type === 'COMPARISON'
    const docNames = conversation.conversationDocuments
      ?.map(cd => cd.document?.originalName).filter(Boolean) || []
    const dateStr = new Date(conversation.createdAt).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    checkBreak(52)

    // Conversation label bar
    doc.setFillColor(24, 24, 27)
    doc.roundedRect(ML, y, contentW, 42, 4, 4, 'F')

    // Type badge
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(isComparison ? 167 : 74, isComparison ? 139 : 222, isComparison ? 250 : 128)
    doc.text(isComparison ? '⬡ COMPARISON' : '◈ SINGLE DOC', ML + 12, y + 14)

    // Date
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(82, 82, 91)
    doc.text(dateStr, ML + 12, y + 28)

    // Doc names on right
    if (docNames.length > 0) {
      const namesText = docNames.join(' · ')
      doc.setFontSize(8)
      doc.setTextColor(113, 113, 122)
      const namesW = doc.getTextWidth(namesText)
      doc.text(namesText, ML + contentW - namesW - 12, y + 14)
    }

    y += 52
  }

  function renderMessage(msg) {
    const isUser = msg.role === 'USER'
    const content = String(msg.content || '')
    const lines = doc.splitTextToSize(content.replace(/\*\*/g, ''), contentW - 20)
    const lineH = 13
    const blockH = lines.length * lineH + 24

    checkBreak(blockH + 28)

    // Left accent bar
    doc.setFillColor(isUser ? 63 : 34, isUser ? 63 : 197, isUser ? 70 : 94)
    doc.rect(ML, y, 3, blockH, 'F')

    // Message background
    doc.setFillColor(isUser ? 24 : 20, isUser ? 24 : 28, isUser ? 27 : 24)
    doc.rect(ML + 3, y, contentW - 3, blockH, 'F')

    // Role label
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(isUser ? 161 : 74, isUser ? 161 : 222, isUser ? 170 : 128)
    doc.text(isUser ? 'YOU' : 'ASSISTANT', ML + 14, y + 14)

    // Message text
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(isUser ? 212 : 228, isUser ? 212 : 228, isUser ? 216 : 231)
    let ty = y + 26
    lines.forEach(line => {
      doc.text(line, ML + 14, ty)
      ty += lineH
    })

    y += blockH

    // Source attribution
    if (!isUser && msg.sources?.length > 0) {
      const isMultiDoc = new Set(msg.sources.map(s => s.documentId).filter(Boolean)).size > 1
      const seen = new Set()
      const unique = msg.sources.filter(s => {
        if (!s.pageNumber) return false
        const k = `${s.documentId}:${s.pageNumber}`
        if (seen.has(k)) return false
        seen.add(k); return true
      })
      if (unique.length > 0) {
        checkBreak(18)
        const srcText = 'Sources: ' + unique.map(s =>
          isMultiDoc ? `${s.documentName} · p.${s.pageNumber}` : `Page ${s.pageNumber}`
        ).join('   ')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(99, 102, 241)
        doc.text(srcText, ML + 14, y + 11)
        y += 20
      }
    }

    y += 6  // gap between messages
  }

  function divider() {
    checkBreak(20)
    y += 4
    doc.setDrawColor(39, 39, 42)
    doc.setLineDashPattern([3, 3], 0)
    doc.line(ML, y, pageW - MR, y)
    doc.setLineDashPattern([], 0)
    y += 16
  }

  function addFooters(filename) {
    const total = doc.internal.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      doc.setPage(p)
      doc.setFillColor(9, 9, 11)
      doc.rect(0, pageH - 36, pageW, 36, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(63, 63, 70)
      doc.text('DocIntel  ·  Conversation Export', ML, pageH - 14)
      doc.text(`Page ${p} of ${total}`, pageW - MR - doc.getTextWidth(`Page ${p} of ${total}`), pageH - 14)
    }
    doc.save(filename)
  }

  return { doc, coverHeader, conversationHeader, renderMessage, divider, newPage, addFooters, getY: () => y }
}

async function exportConversationAsPDF(conversation, messages) {
  const { jsPDF } = await import('jspdf')
  const engine = buildPDFEngine(jsPDF)

  const isComparison = conversation.type === 'COMPARISON'
  const docNames = conversation.conversationDocuments
    ?.map(cd => cd.document?.originalName).filter(Boolean) || []
  const dateStr = new Date(conversation.createdAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })

  engine.coverHeader(
    'Conversation Export',
    [isComparison ? 'Comparison' : 'Single Document', dateStr, ...docNames].join('  ·  ')
  )
  engine.conversationHeader(conversation)

  messages.forEach((msg, i) => {
    engine.renderMessage(msg)
    if (i < messages.length - 1) engine.divider()
  })

  engine.addFooters(`conversation-${new Date(conversation.createdAt).toISOString().slice(0, 10)}.pdf`)
}

async function exportAllAsPDF(documents, allConversations) {
  const { jsPDF } = await import('jspdf')
  const engine = buildPDFEngine(jsPDF)

  const exportDate = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  const docNames = documents.map(d => d.originalName)

  engine.coverHeader(
    'Full Conversation History',
    `Exported ${exportDate}  ·  ${docNames.join(' · ')}`
  )

  let firstConv = true
  for (const { conversation, messages } of allConversations) {
    if (!firstConv) {
      engine.newPage()
    }
    firstConv = false
    engine.conversationHeader(conversation)
    messages.forEach((msg, i) => {
      engine.renderMessage(msg)
      if (i < messages.length - 1) engine.divider()
    })
  }

  engine.addFooters(`full-history-${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ─── Time helper ────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ─── Single conversation row ────────────────────────────────────────────────

function ConversationItem({ conversation }) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  const firstMsg = conversation.messages?.[0]
  const isComparison = conversation.type === 'COMPARISON'
  const docNames = conversation.conversationDocuments
    ?.map(cd => cd.document?.originalName).filter(Boolean)

  async function loadMessages() {
    if (messages) return messages
    setLoading(true)
    try {
      const res = await fetch(`/api/chat/conversation/${conversation.id}`)
      const data = await res.json()
      const msgs = data?.data?.messages || []
      setMessages(msgs)
      return msgs
    } catch {
      setMessages([])
      return []
    } finally {
      setLoading(false)
    }
  }

  async function handleExpand() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (!messages) await loadMessages()
  }

  async function handleExport(e) {
    e.stopPropagation()
    setExporting(true)
    try {
      const msgs = messages || await loadMessages()
      await exportConversationAsPDF(conversation, msgs)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ border: '0.5px solid #27272a', borderRadius: 8, overflow: 'hidden', background: '#18181b' }}>
      {/* Header row */}
      <button
        onClick={handleExpand}
        style={{
          width: '100%', textAlign: 'left', padding: '10px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, color: '#f4f4f5', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {firstMsg?.content || 'Empty conversation'}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#52525b' }}>{timeAgo(conversation.createdAt)}</span>
            {isComparison && (
              <span style={{ fontSize: 10, padding: '1px 6px', border: '0.5px solid #3f3f46', borderRadius: 99, color: '#71717a' }}>
                Comparison
              </span>
            )}
            {isComparison && docNames?.length > 0 && (
              <span style={{ fontSize: 11, color: '#52525b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {docNames.join(' · ')}
              </span>
            )}
          </div>
        </div>

        {/* Per-conversation export button */}
        <button
          onClick={handleExport}
          disabled={exporting}
          title="Export this conversation as PDF"
          style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#52525b', transition: 'color 0.15s' }}
          onMouseEnter={e => { if (!exporting) e.currentTarget.style.color = '#a1a1aa' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#52525b' }}
        >
          {exporting
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'histSpin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          }
        </button>

        {/* Expand chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 2, transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expanded messages */}
      {expanded && (
        <div style={{ borderTop: '0.5px solid #27272a', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
          {loading && <p style={{ fontSize: 12, color: '#52525b', textAlign: 'center', padding: '12px 0' }}>Loading messages...</p>}
          {messages?.length === 0 && <p style={{ fontSize: 12, color: '#52525b', textAlign: 'center', padding: '12px 0' }}>No messages found</p>}
          {messages?.map(msg => (
            msg.role === 'ASSISTANT' && isComparison
              ? <CompareResult key={msg.id} content={msg.content} sources={msg.sources} />
              : <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      )}

      <style>{`@keyframes histSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Per-document section ───────────────────────────────────────────────────

function DocSection({ document, selectedIds, onConversationsLoaded }) {
  const [conversations, setConversations] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setConversations(null)
    setLoading(true)
    fetch(`/api/documents/${document.id}/conversations`)
      .then(r => r.json())
      .then(data => {
        const convs = data?.data?.conversations || []
        setConversations(convs)
        onConversationsLoaded?.(document.id, convs)
      })
      .catch(() => { setConversations([]); onConversationsLoaded?.(document.id, []) })
      .finally(() => setLoading(false))
  }, [document.id])

  return (
    <div>
      {selectedIds.length > 1 && (
        <p style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {document.originalName}
        </p>
      )}
      {loading && <p style={{ fontSize: 12, color: '#52525b' }}>Loading...</p>}
      {!loading && conversations?.length === 0 && <p style={{ fontSize: 12, color: '#52525b' }}>No past conversations</p>}
      {conversations?.map(conv => (
        <div key={conv.id} style={{ marginBottom: 8 }}>
          <ConversationItem conversation={conv} />
        </div>
      ))}
    </div>
  )
}

// ─── Root component ─────────────────────────────────────────────────────────

export default function ConversationHistory({ selectedDocuments }) {
  const [exportingAll, setExportingAll] = useState(false)
  // Track all loaded conversations keyed by documentId
  const [allConvsByDoc, setAllConvsByDoc] = useState({})

  if (!selectedDocuments || selectedDocuments.length === 0) return null

  function handleConversationsLoaded(docId, convs) {
    setAllConvsByDoc(prev => ({ ...prev, [docId]: convs }))
  }

  async function handleExportAll() {
    setExportingAll(true)
    try {
      // Fetch messages for every conversation across all documents
      const allConversations = []
      for (const doc of selectedDocuments) {
        const convs = allConvsByDoc[doc.id] || []
        for (const conv of convs) {
          const res = await fetch(`/api/chat/conversation/${conv.id}`)
          const data = await res.json()
          const messages = data?.data?.messages || []
          allConversations.push({ conversation: conv, messages })
        }
      }
      if (allConversations.length === 0) return
      await exportAllAsPDF(selectedDocuments, allConversations)
    } finally {
      setExportingAll(false)
    }
  }

  const hasAnyConversations = Object.values(allConvsByDoc).some(c => c.length > 0)

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#09090b', display: 'flex', flexDirection: 'column' }}>

      {/* ── Export Full History button ── */}
      {hasAnyConversations && (
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <button
            onClick={handleExportAll}
            disabled={exportingAll}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 8, border: '0.5px solid #3f3f46',
              background: exportingAll ? '#1c1c1f' : '#18181b',
              color: exportingAll ? '#52525b' : '#a1a1aa',
              fontSize: 12, fontWeight: 500, cursor: exportingAll ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!exportingAll) { e.currentTarget.style.background = '#27272a'; e.currentTarget.style.color = '#f4f4f5'; e.currentTarget.style.borderColor = '#52525b' } }}
            onMouseLeave={e => { e.currentTarget.style.background = '#18181b'; e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.borderColor = '#3f3f46' }}
          >
            {exportingAll
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'histSpin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            }
            {exportingAll ? 'Generating PDF...' : 'Export Full History'}
          </button>
        </div>
      )}

      {/* ── Document sections ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {selectedDocuments.map(doc => (
          <DocSection
            key={doc.id}
            document={doc}
            selectedIds={selectedDocuments.map(d => d.id)}
            onConversationsLoaded={handleConversationsLoaded}
          />
        ))}
      </div>
    </div>
  )
}
