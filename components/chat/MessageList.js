// Scrollable list of all messages in a conversation
// Auto-scrolls to bottom when new messages arrive

'use client'
import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.js'
import StreamingIndicator from './StreamingIndicator.js'

export default function MessageList({ messages, isStreaming }) {
  const bottomRef = useRef(null)

  // Auto-scroll to bottom whenever messages change or streaming starts
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // No messages yet — show nothing, the header subtitle is enough guidance
  if (messages.length === 0 && !isStreaming) {
    return <div className="message-list" style={{ background: '#09090b' }} />
  }

  return (
    <div className="message-list">
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
      {isStreaming && <StreamingIndicator />}
      <div ref={bottomRef} />
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
