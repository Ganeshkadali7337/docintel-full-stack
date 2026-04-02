// ConversationHistory — shows past conversations for selected document(s)
// Single doc: lists all conversations for that doc
// Multi-doc: lists conversations per document in separate sections

'use client'
import { useState, useEffect } from 'react'
import MessageBubble from './MessageBubble.js'
import CompareResult from '../compare/CompareResult.js'

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

function ConversationItem({ conversation }) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState(null)
  const [loading, setLoading] = useState(false)

  const firstMsg = conversation.messages?.[0]
  const isComparison = conversation.type === 'COMPARISON'
  const docNames = conversation.conversationDocuments
    ?.map(cd => cd.document?.originalName)
    .filter(Boolean)

  async function handleExpand() {
    if (expanded) { setExpanded(false); return }
    setExpanded(true)
    if (messages) return // already loaded

    setLoading(true)
    try {
      const res = await fetch(`/api/chat/conversation/${conversation.id}`)
      const data = await res.json()
      setMessages(data?.data?.messages || [])
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      border: '0.5px solid #27272a',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#18181b',
    }}>
      {/* Header row */}
      <button
        onClick={handleExpand}
        style={{
          width: '100%', textAlign: 'left', padding: '10px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* First question preview */}
          <p style={{
            fontSize: 13, color: '#f4f4f5', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {firstMsg?.content || 'Empty conversation'}
          </p>
          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: '#52525b' }}>
              {timeAgo(conversation.createdAt)}
            </span>
            {isComparison && (
              <span style={{
                fontSize: 10, padding: '1px 6px',
                border: '0.5px solid #3f3f46', borderRadius: 99,
                color: '#71717a',
              }}>
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
        {/* Expand chevron */}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 2, transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Expanded messages */}
      {expanded && (
        <div style={{ borderTop: '0.5px solid #27272a', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
          {loading && (
            <p style={{ fontSize: 12, color: '#52525b', textAlign: 'center', padding: '12px 0' }}>
              Loading messages...
            </p>
          )}
          {messages && messages.length === 0 && (
            <p style={{ fontSize: 12, color: '#52525b', textAlign: 'center', padding: '12px 0' }}>
              No messages found
            </p>
          )}
          {messages && messages.map(msg => (
            msg.role === 'ASSISTANT' && isComparison
              ? <CompareResult key={msg.id} content={msg.content} />
              : <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      )}
    </div>
  )
}

function DocSection({ document, selectedIds }) {
  const [conversations, setConversations] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setConversations(null)
    setLoading(true)
    fetch(`/api/documents/${document.id}/conversations`)
      .then(r => r.json())
      .then(data => setConversations(data?.data?.conversations || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [document.id])

  return (
    <div>
      {selectedIds.length > 1 && (
        <p style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', margin: '0 0 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {document.originalName}
        </p>
      )}
      {loading && (
        <p style={{ fontSize: 12, color: '#52525b' }}>Loading...</p>
      )}
      {!loading && conversations?.length === 0 && (
        <p style={{ fontSize: 12, color: '#52525b' }}>No past conversations</p>
      )}
      {conversations?.map(conv => (
        <div key={conv.id} style={{ marginBottom: 8 }}>
          <ConversationItem conversation={conv} />
        </div>
      ))}
    </div>
  )
}

export default function ConversationHistory({ selectedDocuments }) {
  if (!selectedDocuments || selectedDocuments.length === 0) return null

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: 16, background: '#09090b',
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      {selectedDocuments.map(doc => (
        <DocSection
          key={doc.id}
          document={doc}
          selectedIds={selectedDocuments.map(d => d.id)}
        />
      ))}
    </div>
  )
}
