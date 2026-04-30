import { useState, useEffect, useCallback } from 'react'
import { useWebSocketContext } from '@/contexts/websocket-context'

interface ConnectionRequest {
  requestId: string
  fromSessionId: string
  fromDisplayName: string
  fromAvatar?: string
  expiresAt: number
}

export function useConnectionRequests() {
  const { addEventListener, sendMessage } = useWebSocketContext()
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([])
  const [currentToast, setCurrentToast] = useState<ConnectionRequest | null>(null)

  // Listen for incoming connection requests
  useEffect(() => {
    const cleanup = addEventListener('incoming-connection-request', (data) => {
      const newRequest: ConnectionRequest = {
        requestId: data.requestId,
        fromSessionId: data.fromSessionId,
        fromDisplayName: data.fromDisplayName,
        fromAvatar: data.fromAvatar,
        expiresAt: data.expiresAt,
      }
      
      setPendingRequests(prev => {
        // Remove any existing request from the same user
        const filtered = prev.filter(req => req.fromSessionId !== data.fromSessionId)
        return [...filtered, newRequest]
      })

      // Show toast for the new request
      setCurrentToast(newRequest)
    })

    return cleanup
  }, [addEventListener])

  // Auto-remove expired requests
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setPendingRequests(prev => {
        const expired = prev.filter(req => req.expiresAt <= now)
        const filtered = prev.filter(req => req.expiresAt > now)
        
        // If current toast request expired, clear it
        if (currentToast && currentToast.expiresAt <= now) {
          setCurrentToast(null)
        }
        
        return filtered
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [currentToast])

  const respondToRequest = useCallback((requestId: string, accepted: boolean) => {
    sendMessage({
      type: 'connection-response',
      requestId,
      accepted,
    })

    // Remove the request from pending list
    setPendingRequests(prev => prev.filter(req => req.requestId !== requestId))
    
    // Clear toast if it's for this request
    if (currentToast?.requestId === requestId) {
      setCurrentToast(null)
    }
  }, [sendMessage, currentToast])

  const acceptRequest = useCallback((requestId: string) => {
    respondToRequest(requestId, true)
  }, [respondToRequest])

  const declineRequest = useCallback((requestId: string) => {
    respondToRequest(requestId, false)
  }, [respondToRequest])

  const dismissToast = useCallback(() => {
    setCurrentToast(null)
  }, [])

  const showNextToast = useCallback(() => {
    if (pendingRequests.length > 0 && !currentToast) {
      setCurrentToast(pendingRequests[0])
    }
  }, [pendingRequests, currentToast])

  return {
    pendingRequests,
    currentToast,
    acceptRequest,
    declineRequest,
    dismissToast,
    showNextToast,
    hasRequests: pendingRequests.length > 0,
  }
}