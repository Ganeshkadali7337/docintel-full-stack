// Shows animated dots while GPT-4o is streaming a response
// Simple CSS animation, no external library

export default function StreamingIndicator() {
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '8px 0' }}>
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
      <style>{`
        .dot {
          width: 6px;
          height: 6px;
          background: #52525b;
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
