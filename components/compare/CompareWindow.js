// Full comparison chat UI for multi-document mode
// Shows selected document names at top and comparison results below

'use client'
import { useEffect } from 'react'
import { useCompare } from '../../hooks/useCompare.js'
import CompareResult from './CompareResult.js'
import ChatInput from '../chat/ChatInput.js'
import StreamingIndicator from '../chat/StreamingIndicator.js'
import MessageBubble from '../chat/MessageBubble.js'

export default function CompareWindow({ selectedDocuments }) {
  const {
    messages,
    isStreaming,
    streamingMessage,
    sendCompareMessage,
    resetCompare
  } = useCompare()

  // Reset when selected documents change
  useEffect(() => {
    resetCompare()
  }, [selectedDocuments.map(d => d.id).join(',')])

  const documentIds = selectedDocuments.map(d => d.id)

  function handleSend(question) {
    sendCompareMessage(question, documentIds)
  }

  // Build display messages including currently streaming message
  const displayMessages = [
    ...messages,
    ...(streamingMessage ? [{
      id: 'streaming',
      role: 'ASSISTANT',
      content: streamingMessage,
      createdAt: new Date().toISOString()
    }] : [])
  ]

  return (
    <div className="compare-window">
      <div className="compare-header">
        <div className="compare-title">Comparing {selectedDocuments.length} documents</div>
        <div className="compare-doc-tags">
          {selectedDocuments.map(doc => (
            <span key={doc.id} className="compare-tag">
              {doc.originalName}
            </span>
          ))}
        </div>
      </div>

      {displayMessages.length > 0 || isStreaming ? (
        <>
          <div className="compare-messages">
            {displayMessages.map(message => (
              message.role === 'USER'
                ? <MessageBubble key={message.id} message={message} />
                : <CompareResult key={message.id} content={message.content} />
            ))}
            {isStreaming && !streamingMessage && <StreamingIndicator />}
          </div>
          <ChatInput onSend={handleSend} isDisabled={isStreaming} />
        </>
      ) : (
        <div className="compare-empty">
          <ChatInput onSend={handleSend} isDisabled={isStreaming} />
        </div>
      )}

      <style>{`
        .compare-window {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        .compare-header {
          padding: 12px 16px;
          border-bottom: 0.5px solid #27272a;
          flex-shrink: 0;
          background: #09090b;
        }
        .compare-title {
          font-size: 14px;
          font-weight: 500;
          color: #f4f4f5;
        }
        .compare-doc-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        .compare-tag {
          font-size: 11px;
          padding: 2px 10px;
          border: 0.5px solid #3f3f46;
          border-radius: 99px;
          color: #a1a1aa;
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .compare-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #09090b;
        }
        .compare-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 40px;
          background: #09090b;
        }
        .compare-empty .chat-input-area {
          border-top: none;
          border: 0.5px solid #27272a;
          border-radius: 12px;
          max-width: 640px;
          padding: 8px 12px;
        }
        .compare-empty .send-button {
          align-self: center;
        }
      `}</style>
    </div>
  )
}
