// Manages single document chat state and API communication
// Handles streaming responses chunk by chunk

'use client'
import { useState, useRef } from 'react'
import { showError } from '../components/ui/Toast.js'

export function useChat() {
  // All messages in the current conversation
  const [messages, setMessages] = useState([])
  // Whether LLM is currently streaming a response
  const [isStreaming, setIsStreaming] = useState(false)
  // Current conversation ID (null means no conversation started yet)
  const [conversationId, setConversationId] = useState(null)
  // The message currently being streamed (built up chunk by chunk)
  const [streamingMessage, setStreamingMessage] = useState('')

  // Send a question and handle the streaming response
  async function sendMessage(question, documentId) {
    if (isStreaming) return

    // Add user message to UI immediately (optimistic update)
    const userMessage = {
      id: Date.now().toString(),
      role: 'USER',
      content: question,
      sources: null,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingMessage('')

    try {
      // Call chat API with question, document, and conversation context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          documentId,
          conversationId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get response')
      }

      // Save conversation ID from response header for follow-ups
      const newConversationId = response.headers.get('X-Conversation-Id')
      if (newConversationId) {
        setConversationId(newConversationId)
      }

      // Read the streaming response chunk by chunk
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let sources = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const data = JSON.parse(line.slice(6))

            if (data.error) {
              throw new Error(data.error)
            }

            if (data.text) {
              fullResponse += data.text
              setStreamingMessage(fullResponse)
            }

            if (data.done) {
              // Streaming complete — add final message to list
              const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'ASSISTANT',
                content: fullResponse,
                sources: sources,
                createdAt: new Date().toISOString()
              }
              setMessages(prev => [...prev, assistantMessage])
              setStreamingMessage('')
            }
          } catch (parseError) {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (error) {
      showError(error.message || 'Failed to get response')
      // Remove the optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id))
    } finally {
      setIsStreaming(false)
    }
  }

  // Load existing conversation messages
  async function loadConversation(convId) {
    try {
      const response = await fetch(`/api/chat/conversation/${convId}`)
      const data = await response.json()
      if (data.data) {
        setMessages(data.data.messages)
        setConversationId(convId)
      }
    } catch (error) {
      showError('Failed to load conversation')
    }
  }

  // Reset chat for a new document
  function resetChat() {
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
    sendMessage,
    loadConversation,
    resetChat
  }
}
