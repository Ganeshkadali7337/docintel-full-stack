// Full single document chat UI
// Combines message list, streaming indicator, and input

'use client'
import { useEffect } from 'react'
import { useChat } from '../../hooks/useChat.js'
import MessageList from './MessageList.js'
import ChatInput from './ChatInput.js'

export default function ChatWindow({ document }) {
  const {
    messages,
    isStreaming,
    streamingMessage,
    sendMessage,
    resetChat
  } = useChat()

  // Reset chat when user switches to a different document
  useEffect(() => {
    resetChat()
  }, [document.id])

  // Build messages array including the currently streaming message
  const displayMessages = [
    ...messages,
    // Add streaming message as a temporary assistant message
    ...(streamingMessage ? [{
      id: 'streaming',
      role: 'ASSISTANT',
      content: streamingMessage,
      sources: null,
      createdAt: new Date().toISOString()
    }] : [])
  ]

  function handleSend(question) {
    sendMessage(question, document.id)
  }

  const hasMessages = displayMessages.length > 0 || (isStreaming && !streamingMessage)

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-doc-name">{document.originalName}</div>
        <div className="chat-doc-meta">
          {document.pageCount} pages · Ask anything about this document
        </div>
      </div>

      {hasMessages ? (
        <>
          <MessageList
            messages={displayMessages}
            isStreaming={isStreaming && !streamingMessage}
          />
          <ChatInput onSend={handleSend} isDisabled={isStreaming} />
        </>
      ) : (
        <div className="chat-empty">
          <ChatInput onSend={handleSend} isDisabled={isStreaming} />
        </div>
      )}

      <style>{`
        .chat-window {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .chat-header {
          padding: 12px 16px;
          border-bottom: 0.5px solid #27272a;
          flex-shrink: 0;
          background: #09090b;
        }
        .chat-doc-name {
          font-size: 14px;
          font-weight: 500;
          color: #f4f4f5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chat-doc-meta {
          font-size: 12px;
          color: #71717a;
          margin-top: 2px;
        }
        .chat-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 40px;
          background: #09090b;
        }
        .chat-empty .chat-input-area {
          border-top: none;
          border: 0.5px solid #27272a;
          border-radius: 12px;
          max-width: 640px;
          padding: 8px 12px;
        }
        .chat-empty .send-button {
          align-self: center;
        }
      `}</style>
    </div>
  )
}
