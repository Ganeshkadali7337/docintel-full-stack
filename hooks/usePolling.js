// usePolling hook — repeatedly checks a document's status until it reaches a final state
// Used by useDocuments after a file is uploaded

'use client'

import { useRef, useEffect } from 'react'
import axios from 'axios'
import { POLLING_INTERVAL_MS } from '../lib/utils/constants'

// Returns startPolling and stopPolling functions
// startPolling(documentId, onStatusChange) calls onStatusChange({ status, errorMessage, pageCount })
// every POLLING_INTERVAL_MS until status is READY or FAILED
export function usePolling() {
  // Store the interval ID so we can clear it later
  const intervalRef = useRef(null)

  // Start polling a document's status on a fixed interval
  function startPolling(documentId, onStatusChange) {
    // Clear any existing interval before starting a new one
    stopPolling()

    intervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`/api/documents/${documentId}/status`)
        const { status, errorMessage, pageCount } = response.data.data

        // Notify the caller of the latest status
        onStatusChange({ status, errorMessage, pageCount })

        // Stop polling once the document reaches a final state
        if (status === 'READY' || status === 'FAILED') {
          stopPolling()
        }
      } catch (error) {
        // Stop polling on network or server errors too
        stopPolling()
      }
    }, POLLING_INTERVAL_MS)
  }

  // Clear the polling interval
  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Cleanup: stop polling when the component that uses this hook unmounts
  useEffect(() => {
    return () => stopPolling()
  }, [])

  return { startPolling, stopPolling }
}
