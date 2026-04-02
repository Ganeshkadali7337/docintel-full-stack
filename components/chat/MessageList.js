// Scrollable list of all messages in a conversation
// Auto-scrolls to bottom whenever messages change or streaming updates

'use client'
import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.js'
import StreamingIndicator from './StreamingIndicator.js'

export default function MessageList({ messages, isStreaming }) {
  const listRef = useRef(null)

  // Scroll to bottom after every render — covers both new messages and streaming chunks
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  })

  if (messages.length === 0 && !isStreaming) {
    return <div className="message-list" ref={listRef} style={{ background: '#09090b' }} />
  }

  return (
    <div className="message-list" ref={listRef}>
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && <StreamingIndicator />}
      <style>{`
        .message-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #09090b;
        }
      `}</style>
    </div>
  )
}
