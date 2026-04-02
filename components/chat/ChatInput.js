// Text input and send button for the chat
// Disabled while streaming to prevent multiple simultaneous requests

'use client'
import { useState } from 'react'

export default function ChatInput({ onSend, isDisabled }) {
  const [inputValue, setInputValue] = useState('')

  // Handle send on button click or Enter key
  function handleSend() {
    const trimmed = inputValue.trim()
    if (!trimmed || isDisabled) return
    onSend(trimmed)
    setInputValue('')
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-input-area">
      <textarea
        className="chat-textarea"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isDisabled
            ? 'Waiting for response...'
            : 'Ask a question... (Enter to send)'
        }
        disabled={isDisabled}
        rows={2}
      />
      <button
        className="send-button"
        onClick={handleSend}
        disabled={isDisabled || !inputValue.trim()}
      >
        Send
      </button>
      <style>{`
        .chat-input-area {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 0.5px solid #27272a;
          flex-shrink: 0;
          background: #09090b;
          width: 100%;
          box-sizing: border-box;
        }
        .chat-textarea {
          flex: 1;
          padding: 8px 12px;
          font-size: 14px;
          border: 0.5px solid #27272a;
          border-radius: 8px;
          resize: none;
          font-family: inherit;
          outline: none;
          background: #18181b;
          color: #f4f4f5;
        }
        .chat-textarea::placeholder { color: #52525b; }
        .chat-textarea:disabled {
          background: #18181b;
          color: #3f3f46;
        }
        .send-button {
          padding: 8px 16px;
          font-size: 14px;
          border: 0.5px solid #3f3f46;
          border-radius: 8px;
          background: #f4f4f5;
          color: #09090b;
          cursor: pointer;
          align-self: center;
          font-weight: 500;
        }
        .send-button:disabled {
          background: #27272a;
          color: #52525b;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
