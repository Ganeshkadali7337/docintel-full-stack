// Main content area — switches between empty state, chat/compare, analytics, and history
// Tabs: Chat/Compare · Analytics · History

'use client'
import { useState, useEffect } from 'react'
import EmptyState from '../ui/EmptyState.js'
import ChatWindow from '../chat/ChatWindow.js'
import CompareWindow from '../compare/CompareWindow.js'
import AnalyticsPanel from '../analytics/AnalyticsPanel.js'
import ConversationHistory from '../chat/ConversationHistory.js'

export default function MainArea({ selectedIds, documents }) {
  const [activeTab, setActiveTab] = useState('chat')

  // Reset to chat tab when selection changes
  useEffect(() => {
    setActiveTab('chat')
  }, [selectedIds.join(',')])

  const selectedDocuments = documents.filter(doc => selectedIds.includes(doc.id))

  // No documents selected — show welcome empty state (no tabs)
  if (selectedIds.length === 0) {
    return (
      <div className="main-area flex items-center justify-center bg-[#09090b] w-full">
        <EmptyState
          title="Select a document to get started"
          subtitle="Click a document in the sidebar to chat with it, or select 2-3 to compare"
        />
      </div>
    )
  }

  const chatLabel = selectedIds.length === 1 ? 'Chat' : 'Compare'

  return (
    <div className="main-area bg-[#09090b]" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Tab bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          {chatLabel}
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {/* Content */}
      {activeTab === 'chat' && selectedIds.length === 1 && (
        <ChatWindow document={selectedDocuments[0]} />
      )}
      {activeTab === 'chat' && selectedIds.length >= 2 && (
        <CompareWindow selectedDocuments={selectedDocuments} />
      )}
      {activeTab === 'history' && (
        <ConversationHistory selectedDocuments={selectedDocuments} />
      )}
      {activeTab === 'analytics' && (
        <AnalyticsPanel selectedDocuments={selectedDocuments} />
      )}

      <style>{`
        .main-area {
          flex: 1;
          min-width: 0;
          height: 100%;
          overflow: hidden;
        }
        .tab-bar {
          display: flex;
          gap: 0;
          border-bottom: 0.5px solid #27272a;
          flex-shrink: 0;
          background: #09090b;
          padding: 0 16px;
        }
        .tab-btn {
          padding: 10px 16px;
          font-size: 13px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: #71717a;
          cursor: pointer;
          margin-bottom: -0.5px;
          transition: color 0.15s;
        }
        .tab-btn:hover { color: #a1a1aa; }
        .tab-active {
          color: #f4f4f5 !important;
          border-bottom-color: #f4f4f5;
        }
      `}</style>
    </div>
  )
}
