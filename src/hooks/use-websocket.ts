import { useState, useEffect, useCallback, useRef } from 'react'
import { WebSocketMessage, UserSession } from '@/types/messages'

interface SessionData {
  sessionId: string
  token: string
  displayName: string
  avatar?: string
  status?: 'online' | 'in-call' | 'away'
}

interface WebSocketState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  session: SessionData | null
  users: UserSession[]
  connections: Set<string>
}

interface WebSocketHook extends WebSocketState {
  joinSession: (displayName: string, avatar?: string) => Promise<void>
  sendMessage: (message: any) => void
  reconnect: (token?: string) => void
  disconnect: () => void
  addEventListener: (type: string, callback: (data: any) => void) => () => void
}

const WEBSOCKET_URL = typeof window !== 'undefined'
  ? (process.env.NODE_ENV === 'production' 
      ? `wss://${window.location.host}/ws`
      : `ws://${window.location.host}/ws`)
  : ''

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000] // Exponential backoff

export function useWebSocket(): WebSocketHook {
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    session: null,
    users: [],
    connections: new Set(),
  })

  const sessionRef = useRef<SessionData | null>(null)
  
  // Keep ref in sync with state
  useEffect(() => {
    sessionRef.current = state.session
  }, [state.session])

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const messageQueueRef = useRef<any[]>([])
  const eventListenersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map())

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add event listener for specific message types
  const addEventListener = useCallback((type: string, callback: (data: any) => void) => {
    if (!eventListenersRef.current.has(type)) {
      eventListenersRef.current.set(type, new Set())
    }
    eventListenersRef.current.get(type)!.add(callback)

    // Return cleanup function
    return () => {
      const listeners = eventListenersRef.current.get(type)
      if (listeners) {
        listeners.delete(callback)
        if (listeners.size === 0) {
          eventListenersRef.current.delete(type)
        }
      }
    }
  }, [])

  // Emit event to listeners
  const emitEvent = useCallback((type: string, data: any) => {
    const listeners = eventListenersRef.current.get(type)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }, [])

  // Send message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (!state.session) {
      console.error('Cannot send message: No active session')
      return
    }

    const fullMessage = {
      ...message,
      id: generateMessageId(),
      timestamp: Date.now(),
      sessionId: state.session.sessionId,
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(fullMessage))
    } else {
      // Queue message for when connection is restored
      messageQueueRef.current.push(fullMessage)
      console.warn('WebSocket not connected, message queued')
    }
  }, [state.session, generateMessageId])

  // Process queued messages
  const processMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      const queue = [...messageQueueRef.current]
      messageQueueRef.current = []
      
      queue.forEach(message => {
        wsRef.current!.send(JSON.stringify(message))
      })
      
      console.log(`Sent ${queue.length} queued messages`)
    }
  }, [])

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data)
      
      switch (message.type) {
        case 'session-created':
          setState(prev => ({
            ...prev,
            session: {
              sessionId: message.sessionId,
              token: message.token,
              displayName: message.displayName,
              avatar: message.avatar,
            },
            error: null,
          }))
          emitEvent('session-created', message)
          break

        case 'presence-update':
          setState(prev => ({
            ...prev,
            users: message.users,
          }))
          break

        case 'connection-established':
          setState(prev => ({
            ...prev,
            connections: new Set([...prev.connections, message.sessionId]),
          }))
          emitEvent('connection-established', message)
          break

        case 'connection-rejected':
          emitEvent('connection-rejected', message)
          break

        case 'incoming-connection-request':
          emitEvent('incoming-connection-request', message)
          break

        case 'chat-message-received':
          emitEvent('chat-message-received', message)
          break

        case 'chat-message-edited':
          emitEvent('chat-message-edited', message)
          break

        case 'chat-message-edited-confirm':
          emitEvent('chat-message-edited-confirm', message)
          break

        case 'chat-message-deleted':
          emitEvent('chat-message-deleted', message)
          break

        case 'chat-message-deleted-confirm':
          emitEvent('chat-message-deleted-confirm', message)
          break

        case 'message-delivered':
          emitEvent('message-delivered', message)
          break

        case 'typing-indicator-received':
          emitEvent('typing-indicator-received', message)
          break

        case 'incoming-file-transfer-request':
          emitEvent('incoming-file-transfer-request', message)
          break

        case 'file-transfer-response':
          emitEvent('file-transfer-response', message)
          break

        case 'file-transfer-data':
          emitEvent('file-transfer-data', message)
          break

        case 'file-transfer-start':
          emitEvent('file-transfer-start', message)
          break

        case 'file-transfer-progress':
          emitEvent('file-transfer-progress', message)
          break

        case 'file-transfer-complete':
          emitEvent('file-transfer-complete', message)
          break

        case 'webrtc-offer':
        case 'webrtc-answer':
        case 'webrtc-ice-candidate':
        case 'webrtc-call-declined':
        case 'webrtc-call-ended':
          emitEvent('webrtc-signaling', message)
          break

        case 'error':
          console.error('WebSocket error:', message)
          setState(prev => ({
            ...prev,
            error: message.message,
          }))
          emitEvent('error', message)
          break

        default:
          console.warn('Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }, [emitEvent])

  // Connect to WebSocket
  const connect = useCallback((reconnectToken?: string) => {
    console.log('[useWebSocket] connect() called')
    console.log('[useWebSocket] Current WebSocket state:', wsRef.current?.readyState)
    console.log('[useWebSocket] Attempting to connect to:', WEBSOCKET_URL)
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[useWebSocket] Already connected, skipping')
      return // Already connected
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
    }))

    try {
      console.log('[useWebSocket] Creating new WebSocket connection...')
      const ws = new WebSocket(WEBSOCKET_URL)
      wsRef.current = ws
      console.log('[useWebSocket] WebSocket instance created')

      ws.onopen = () => {
        console.log('WebSocket connected')
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }))
        
        reconnectAttemptsRef.current = 0
        processMessageQueue()

        // Auto-rejoin session
        let savedSession = sessionRef.current
        if (!savedSession && typeof window !== 'undefined') {
          try {
            const saved = localStorage.getItem('hub-session')
            if (saved) {
              savedSession = JSON.parse(saved)
            }
          } catch (e) {
            console.error('Failed to parse saved session', e)
          }
        }

        if (savedSession && savedSession.displayName) {
          console.log('Auto-rejoining with session data for', savedSession.displayName)
          const joinMessage = {
            type: 'join',
            displayName: savedSession.displayName,
            avatar: savedSession.avatar,
            sessionId: savedSession.sessionId,
          }
          ws.send(JSON.stringify(joinMessage))
        } else if (reconnectToken) {
          // If reconnecting with token, attempt to restore session
          // Implementation would send token validation message
          console.log('Attempting to restore session with token')
        }
      }

      ws.onmessage = handleMessage

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        
        // Check if this is a connection failure (never connected)
        const wasNeverConnected = !state.isConnected && state.isConnecting
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: wasNeverConnected 
            ? 'Cannot connect to WebSocket server. Please ensure the server is running with "npm run dev"'
            : prev.error,
        }))

        // Attempt reconnection if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < RECONNECT_DELAYS.length) {
          const delay = RECONNECT_DELAYS[reconnectAttemptsRef.current]
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++
            connect(reconnectToken)
          }, delay)
        } else if (event.code !== 1000) {
          // Max reconnection attempts reached
          setState(prev => ({
            ...prev,
            error: 'Failed to connect to server. Please check that the server is running with "npm run dev"',
          }))
        }
      }

      ws.onerror = (error) => {
        console.error('[useWebSocket] WebSocket error event:', error)
        console.error('[useWebSocket] WebSocket readyState:', ws.readyState)
        console.error('[useWebSocket] WebSocket URL:', ws.url)
        setState(prev => ({
          ...prev,
          error: 'WebSocket server not available. Make sure you started the server with "npm run dev"',
          isConnecting: false,
        }))
      }

    } catch (error) {
      console.error('[useWebSocket] Failed to create WebSocket connection:', error)
      console.error('[useWebSocket] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      setState(prev => ({
        ...prev,
        error: 'Failed to connect',
        isConnecting: false,
      }))
    }
  }, [handleMessage, processMessageQueue])

  // Join session with display name
  const joinSession = useCallback(async (displayName: string, avatar?: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      let savedSession = null
      if (typeof window !== 'undefined') {
        try {
          const saved = localStorage.getItem('hub-session')
          if (saved) savedSession = JSON.parse(saved)
        } catch (e) {}
      }

      const joinMessage = {
        type: 'join',
        displayName,
        avatar,
        sessionId: savedSession?.sessionId,
      }

      // Listen for session creation or error
      let timeoutId: NodeJS.Timeout

      const cleanup = addEventListener('session-created', () => {
        clearTimeout(timeoutId)
        cleanup()
        resolve()
      })

      const errorCleanup = addEventListener('error', (error) => {
        if (error.code === 'INVALID_DISPLAY_NAME' || error.code === 'NAME_TAKEN' || error.code === 'JOIN_FAILED') {
          clearTimeout(timeoutId)
          errorCleanup()
          cleanup()
          reject(new Error(error.message))
        }
      })

      wsRef.current.send(JSON.stringify(joinMessage))

      // Timeout after 10 seconds
      timeoutId = setTimeout(() => {
        cleanup()
        errorCleanup()
        reject(new Error('Join request timed out'))
      }, 10000)
    })
  }, [addEventListener])

  // Reconnect with optional token
  const reconnect = useCallback((token?: string) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    reconnectAttemptsRef.current = 0
    connect(token)
  }, [connect])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }

    setState({
      isConnected: false,
      isConnecting: false,
      error: null,
      session: null,
      users: [],
      connections: new Set(),
    })

    messageQueueRef.current = []
    eventListenersRef.current.clear()
  }, [])

  // Initialize connection on mount
  useEffect(() => {
    console.log('[useWebSocket] Initializing WebSocket connection...')
    console.log('[useWebSocket] WEBSOCKET_URL:', WEBSOCKET_URL)
    console.log('[useWebSocket] window.location.host:', typeof window !== 'undefined' ? window.location.host : 'N/A')
    
    if (typeof window === 'undefined') {
      console.log('[useWebSocket] SSR detected, skipping connection')
      return
    }
    
    connect()

    return () => {
      console.log('[useWebSocket] Cleaning up WebSocket connection')
      disconnect()
    }
  }, [connect, disconnect])

  // Idle Detection
  useEffect(() => {
    if (!state.isConnected || !state.session) return

    let idleTimer: NodeJS.Timeout
    const IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes

    const resetIdleTimer = () => {
      if (sessionRef.current?.status === 'away') {
        sendMessage({
          type: 'user-status-update',
          status: 'online',
        } as any)
        
        setState(prev => prev.session ? ({
          ...prev,
          session: { ...prev.session, status: 'online' }
        }) : prev)
      }

      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => {
        if (sessionRef.current?.status === 'online') {
          sendMessage({
            type: 'user-status-update',
            status: 'away',
          } as any)
          
          setState(prev => prev.session ? ({
            ...prev,
            session: { ...prev.session, status: 'away' }
          }) : prev)
        }
      }, IDLE_TIMEOUT)
    }

    // Attach listeners
    window.addEventListener('mousemove', resetIdleTimer)
    window.addEventListener('keypress', resetIdleTimer)
    window.addEventListener('touchstart', resetIdleTimer)
    window.addEventListener('scroll', resetIdleTimer)
    
    resetIdleTimer() // initialize

    return () => {
      clearTimeout(idleTimer)
      window.removeEventListener('mousemove', resetIdleTimer)
      window.removeEventListener('keypress', resetIdleTimer)
      window.removeEventListener('touchstart', resetIdleTimer)
      window.removeEventListener('scroll', resetIdleTimer)
    }
  }, [state.isConnected, state.session?.sessionId, sendMessage])

  // Expose addEventListener for components to use
  const hookWithEvents = {
    ...state,
    joinSession,
    sendMessage,
    reconnect,
    disconnect,
    addEventListener,
  }

  return hookWithEvents
}