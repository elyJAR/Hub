'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useWebSocket } from '@/hooks/use-websocket'

interface WebSocketContextType {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  session: {
    sessionId: string
    token: string
    displayName: string
    avatar?: string
  } | null
  users: any[]
  connections: Set<string>
  joinSession: (displayName: string, avatar?: string) => Promise<void>
  sendMessage: (message: any) => void
  reconnect: (token?: string) => void
  disconnect: () => void
  addEventListener: (type: string, callback: (data: any) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const websocket = useWebSocket()

  return (
    <WebSocketContext.Provider value={websocket}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}