'use client'

import { useEffect, useState } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { UserSession } from '@/types/messages'
import { Users, Phone, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'

interface SessionData {
  sessionId: string
  token: string
  displayName: string
  avatar?: string
}

interface UserListProps {
  currentSession: SessionData
  selectedUserId?: string
  onSelectUser: (userId: string) => void
  onStartCall?: (userId: string) => void
  isConnected: boolean
}

export function UserList({ 
  currentSession, 
  selectedUserId, 
  onSelectUser,
  onStartCall, 
  isConnected 
}: UserListProps) {
  const { addEventListener, sendMessage, users: allUsers } = useWebSocketContext()
  const [connections, setConnections] = useState<Set<string>>(new Set())
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())

  // Filter out current user and offline users from the list
  const users = allUsers.filter(
    user => user.sessionId !== currentSession.sessionId && user.status !== 'offline'
  )

  // Load persistent connections from localStorage (by displayName)
  useEffect(() => {
    const savedConnections = localStorage.getItem(`hub-connections-${currentSession.displayName}`)
    if (savedConnections) {
      try {
        const parsed = JSON.parse(savedConnections) as string[]
        console.log('[UserList] Loaded saved connection displayNames:', parsed)
        
        // Convert displayNames to current sessionIds
        const sessionIds = new Set<string>()
        parsed.forEach(displayName => {
          const user = allUsers.find(u => u.displayName === displayName)
          if (user) {
            sessionIds.add(user.sessionId)
            console.log(`[UserList] Mapped ${displayName} -> ${user.sessionId}`)
          }
        })
        
        setConnections(sessionIds)
      } catch (e) {
        console.error('Failed to parse saved connections', e)
      }
    }
  }, [currentSession.displayName, allUsers])

  // Save connections to localStorage (by displayName) whenever they change
  useEffect(() => {
    if (connections.size > 0) {
      // Convert sessionIds to displayNames for storage
      const displayNames = Array.from(connections)
        .map(sessionId => {
          const user = allUsers.find(u => u.sessionId === sessionId)
          return user?.displayName
        })
        .filter(Boolean) as string[]
      
      console.log('[UserList] Saving connection displayNames:', displayNames)
      localStorage.setItem(
        `hub-connections-${currentSession.displayName}`,
        JSON.stringify(displayNames)
      )
    }
  }, [connections, currentSession.displayName, allUsers])

  // Listen for connection events
  useEffect(() => {
    console.log('[UserList] Setting up event listeners')
    
    const cleanup1 = addEventListener('connection-established', (data) => {
      console.log('[UserList] Connection established:', data)
      setConnections(prev => new Set([...prev, data.sessionId]))
      setPendingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(data.sessionId)
        return newSet
      })
      
      // Show success notification
      console.log('[UserList] Showing success toast')
      toast.success(`Connected with ${data.displayName}`)
    })

    const cleanup2 = addEventListener('connection-rejected', (data) => {
      console.log('[UserList] Connection rejected:', data)
      setPendingRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(data.sessionId)
        return newSet
      })
      
      // Show rejection notification
      toast.error(`${data.displayName} declined your request`)
    })

    return () => {
      cleanup1()
      cleanup2()
    }
  }, [addEventListener])

  const handleConnectionRequest = (targetUserId: string) => {
    console.log('[UserList] Sending connection request to:', targetUserId)
    
    // Generate unique request ID
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Add to pending immediately for instant feedback
    setPendingRequests(prev => new Set([...prev, targetUserId]))
    
    // Show toast immediately
    toast.info('Connection request sent')
    
    sendMessage({
      type: 'connection-request',
      targetSessionId: targetUserId,
      id: requestId,
    } as any)
  }

  const isUserConnected = (userId: string) => connections.has(userId)
  const isRequestPending = (userId: string) => pendingRequests.has(userId)

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3 mb-3">
          <AvatarDisplay avatarId={currentSession.avatar} size="md" />
          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-foreground truncate">
              {currentSession.displayName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Online' : 'Disconnected'}
            </p>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          {users.length} {users.length === 1 ? 'user' : 'users'} online
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {users.length === 0 ? (
          <div className="p-4 text-center">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isConnected ? 'No other users online' : 'Connecting...'}
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {users.map((user) => {
              const connected = isUserConnected(user.sessionId)
              const pending = isRequestPending(user.sessionId)
              const isSelected = selectedUserId === user.sessionId

              return (
                <div
                  key={user.sessionId}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                    }
                  `}
                  onClick={() => {
                    if (connected) {
                      onSelectUser(user.sessionId)
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <AvatarDisplay avatarId={user.avatar} size="md" />
                      {/* Status indicator */}
                      <div className={`
                        absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background
                        ${user.status === 'online' ? 'bg-green-500' : ''}
                        ${user.status === 'away' ? 'bg-yellow-500' : ''}
                        ${user.status === 'in-call' ? 'bg-red-500' : ''}
                      `} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-foreground truncate">
                          {user.displayName}
                        </h3>
                        {connected && (
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {connected ? 'Connected' : pending ? 'Request pending...' : 'Not connected'}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!connected && !pending ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConnectionRequest(user.sessionId)
                      }}
                      className="mt-2 w-full text-xs bg-primary text-primary-foreground py-1.5 px-3 rounded hover:bg-primary/90 transition-colors"
                    >
                      Send Connection Request
                    </button>
                  ) : pending ? (
                    <button
                      disabled
                      className="mt-2 w-full text-xs bg-muted text-muted-foreground py-1.5 px-3 rounded cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Waiting for response...</span>
                    </button>
                  ) : (
                    <div className="mt-2 flex">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectUser(user.sessionId)
                        }}
                        className="w-full text-xs bg-muted text-foreground py-1.5 px-3 rounded hover:bg-muted/80 transition-colors"
                      >
                        Message
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Hub • Local Network
        </div>
      </div>
    </div>
  )
}