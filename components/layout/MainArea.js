// Main content area — switches between empty state, chat/compare, and analytics
// Two tabs: Chat and Analytics — both available whenever docs are selected

'use client'
import { useState, useEffect } from 'react'
import EmptyState from '../ui/EmptyState.js'
import ChatWindow from '../chat/ChatWindow.js'
import CompareWindow from '../compare/CompareWindow.js'
import AnalyticsPanel from '../analytics/AnalyticsPanel.js'

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

  // Render tab bar + content for any selection (1, 2, or 3 docs)
  return (
    <div className="main-area bg-[#09090b]" style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Tab bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          {selectedIds.length === 1 ? 'Chat' : 'Compare'}
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
      {activeTab === 'analytics' && (
        <AnalyticsPanel selectedDocuments={selectedDocuments} />
      )}

      <style>{`
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

