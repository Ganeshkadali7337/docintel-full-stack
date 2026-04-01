// Manages multi-document comparison state and API communication
// Very similar to useChat but sends multiple documentIds

'use client'
import { useState } from 'react'
import { showError } from '../components/ui/Toast.js'

export function useCompare() {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [conversationId, setConversationId] = useState(null)

  async function sendCompareMessage(question, documentIds) {
    if (isStreaming) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'USER',
      content: question,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingMessage('')

    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, documentIds, conversationId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get comparison')
      }

      const newConversationId = response.headers.get('X-Conversation-Id')
      if (newConversationId) setConversationId(newConversationId)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.error) throw new Error(data.error)
            if (data.text) {
              fullResponse += data.text
              setStreamingMessage(fullResponse)
            }
            if (data.done) {
              setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'ASSISTANT',
                content: fullResponse,
                createdAt: new Date().toISOString()
              }])
              setStreamingMessage('')
            }
          } catch (parseError) {
            // Skip malformed lines
          }
        }
      }
    } catch (error) {
      showError(error.message || 'Comparison failed')
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    } finally {
      setIsStreaming(false)
    }
  }

  function resetCompare() {
    setMessages([])
    setConversationId(null)
    setStreamingMessage('')
    setIsStreaming(false)
  }

  return {
    messages,
    isStreaming,
    streamingMessage,
    conversationId,
    sendCompareMessage,
    resetCompare
  }
}
