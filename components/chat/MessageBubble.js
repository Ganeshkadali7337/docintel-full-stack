// Renders a single chat message
// User messages align right, assistant messages align left
// Assistant messages show source attribution below

import SourceAttribution from './SourceAttribution.js'

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

export default function MessageBubble({ message }) {
  const isUser = message.role === 'USER'

  return (
    <div className={`message-wrapper ${isUser ? 'user' : 'assistant'}`}>
      <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
        {isUser ? message.content : renderMarkdown(message.content)}
      </div>
      {!isUser && message.sources && (
        <SourceAttribution sources={message.sources} />
      )}
      <style>{`
        .message-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 75%;
        }
        .message-wrapper.user {
          align-self: flex-end;
          align-items: flex-end;
        }
        .message-wrapper.assistant {
          align-self: flex-start;
          align-items: flex-start;
        }
        .message-bubble {
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .user-bubble {
          background: #27272a;
          border: 0.5px solid #3f3f46;
          color: #f4f4f5;
        }
        .assistant-bubble {
          background: #18181b;
          border: 0.5px solid #27272a;
          color: #e4e4e7;
        }
      `}</style>
    </div>
  )
}
