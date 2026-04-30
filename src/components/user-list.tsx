'use client'

import { useEffect, useState } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { UserSession } from '@/types/messages'
import { Users } from 'lucide-react'

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
  isConnected: boolean
}

export function UserList({ 
  currentSession, 
  selectedUserId, 
  onSelectUser, 
  isConnected 
}: UserListProps) {
  const { addEventListener, sendMessage, users: allUsers } = useWebSocketContext()
  const [connections, setConnections] = useState<Set<string>>(new Set())

  // Filter out current user from the list
  const users = allUsers.filter(user => user.sessionId !== currentSession.sessionId)

  // Listen for connection events
  useEffect(() => {
    const cleanup1 = addEventListener('connection-established', (data) => {
      setConnections(prev => new Set([...prev, data.sessionId]))
    })

    return cleanup1
  }, [addEventListener])

  const handleConnectionRequest = (targetUserId: string) => {
    sendMessage({
      type: 'connection-request',
      targetSessionId: targetUserId,
    })
  }

  const isUserConnected = (userId: string) => connections.has(userId)

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
                        {connected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>

                  {/* Connection button */}
                  {!connected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleConnectionRequest(user.sessionId)
                      }}
                      className="mt-2 w-full text-xs bg-primary text-primary-foreground py-1.5 px-3 rounded hover:bg-primary/90 transition-colors"
                    >
                      Send Connection Request
                    </button>
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