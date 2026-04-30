'use client'

import { useState, useEffect } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { X, UserPlus } from 'lucide-react'

interface ConnectionRequest {
  requestId: string
  fromSessionId: string
  fromDisplayName: string
  fromAvatar?: string
  expiresAt: number
}

interface ConnectionRequestModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ConnectionRequestModal({ isOpen, onClose }: ConnectionRequestModalProps) {
  const { addEventListener, sendMessage } = useWebSocketContext()
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([])

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
    })

    return cleanup
  }, [addEventListener])

  // Auto-remove expired requests
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setPendingRequests(prev => prev.filter(req => req.expiresAt > now))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Auto-open modal when requests arrive
  useEffect(() => {
    if (pendingRequests.length > 0 && !isOpen) {
      // Auto-open could be implemented here, but let's keep it manual for now
    }
  }, [pendingRequests.length, isOpen])

  const handleResponse = (requestId: string, accepted: boolean) => {
    sendMessage({
      type: 'connection-response',
      requestId,
      accepted,
    })

    // Remove the request from pending list
    setPendingRequests(prev => prev.filter(req => req.requestId !== requestId))
  }

  const getTimeRemaining = (expiresAt: number) => {
    const remaining = Math.max(0, expiresAt - Date.now())
    return Math.ceil(remaining / 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Connection Requests
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {pendingRequests.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">
                No pending connection requests
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {pendingRequests.map((request) => {
                const timeRemaining = getTimeRemaining(request.expiresAt)
                
                return (
                  <div
                    key={request.requestId}
                    className="connection-request border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <AvatarDisplay avatarId={request.fromAvatar} size="md" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {request.fromDisplayName}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          wants to connect with you
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {timeRemaining}s
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleResponse(request.requestId, true)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleResponse(request.requestId, false)}
                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Decline
                      </button>
                    </div>

                    {/* Progress bar for time remaining */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div
                          className="bg-primary h-1 rounded-full transition-all duration-1000"
                          style={{
                            width: `${(timeRemaining / 30) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Toast notification for connection requests
interface ConnectionRequestToastProps {
  request: ConnectionRequest | null
  onAccept: () => void
  onDecline: () => void
  onDismiss: () => void
}

export function ConnectionRequestToast({ 
  request, 
  onAccept, 
  onDecline, 
  onDismiss 
}: ConnectionRequestToastProps) {
  const [timeRemaining, setTimeRemaining] = useState(30)

  useEffect(() => {
    if (!request) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, request.expiresAt - Date.now())
      const seconds = Math.ceil(remaining / 1000)
      setTimeRemaining(seconds)

      if (seconds <= 0) {
        onDismiss()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [request, onDismiss])

  if (!request) return null

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm z-50 animate-slide-down">
      <div className="flex items-start space-x-3">
        <AvatarDisplay avatarId={request.fromAvatar} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Connection Request
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">{request.fromDisplayName}</span> wants to connect
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={onAccept}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-colors"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-2 py-1 rounded transition-colors"
            >
              Decline
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {timeRemaining}s
            </span>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}