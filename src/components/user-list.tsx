'use client'

import { useEffect, useState } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { UserSession } from '@/types/messages'
import { Users, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'

interface SessionData {
  sessionId: string
  persistentId: string
  token: string
  displayName: string
  avatar?: string
}

interface UserListProps {
  currentSession: SessionData
  selectedUserPersistentId?: string
  selectedGroupId?: string
  onSelectUser: (persistentId: string) => void
  onSelectGroup: (groupId: string) => void
  isConnected: boolean
}

export function UserList({ 
  currentSession, 
  selectedUserPersistentId, 
  selectedGroupId,
  onSelectUser,
  onSelectGroup,
  isConnected 
}: UserListProps) {
  const { addEventListener, sendMessage, users: allUsers, groups, createGroup, joinGroup } = useWebSocketContext()
  const [connections, setConnections] = useState<Set<string>>(new Set())
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())

  const handleCreateGroup = () => {
    const name = prompt('Enter group name:')
    if (name && name.trim()) {
      createGroup(name.trim())
    }
  }

  const handleJoinGroup = () => {
    const id = prompt('Enter group ID:')
    if (id && id.trim()) {
      joinGroup(id.trim())
    }
  }

  // Filter out current user from the list
  const users = allUsers.filter(user => user.sessionId !== currentSession.sessionId)

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

    // Set a timeout to clear the pending state and show a notification
    setTimeout(() => {
      setPendingRequests(prev => {
        if (prev.has(targetUserId)) {
          const newSet = new Set(prev)
          newSet.delete(targetUserId)
          toast.info('Connection request timed out')
          return newSet
        }
        return prev
      })
    }, 30000)
  }

  // Load persistent connections from localStorage (by persistentId)
  useEffect(() => {
    const trustedUsersStr = localStorage.getItem('hub-trusted-users')
    if (trustedUsersStr) {
      try {
        const trustedIds = JSON.parse(trustedUsersStr) as string[]
        console.log('[UserList] Online trusted users checking...')
        
        // Find online users who are in our trusted list
        const onlineFriends = users.filter(user => user.persistentId && trustedIds.includes(user.persistentId))
        
        onlineFriends.forEach(friend => {
          // If not already connected and not already pending, auto-send request
          if (!connections.has(friend.sessionId) && !pendingRequests.has(friend.sessionId)) {
            console.log(`[UserList] Auto-connecting to friend: ${friend.displayName}`)
            handleConnectionRequest(friend.sessionId)
          }
        })
      } catch (e) {
        console.error('Failed to parse trusted users', e)
      }
    }
  }, [users.length, connections.size, pendingRequests.size])

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
        
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCreateGroup}
            className="text-[10px] bg-blue-500/10 text-blue-500 py-2 rounded-md hover:bg-blue-500/20 transition-colors flex items-center justify-center space-x-1 font-bold"
          >
            <Users className="w-3 h-3" />
            <span>CREATE</span>
          </button>
          <button
            onClick={handleJoinGroup}
            className="text-[10px] bg-purple-500/10 text-purple-500 py-2 rounded-md hover:bg-purple-500/20 transition-colors flex items-center justify-center space-x-1 font-bold"
          >
            <Users className="w-3 h-3" />
            <span>JOIN BY ID</span>
          </button>
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Groups List */}
        {groups.length > 0 && (
          <div className="p-2 space-y-1">
            <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 mt-2">Groups</h3>
            {groups.map((group) => (
              <div
                key={group.id}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors
                  ${selectedGroupId === group.id 
                    ? 'bg-blue-500/10 border border-blue-500/20' 
                    : 'hover:bg-muted/50'
                  }
                `}
                onClick={() => onSelectGroup(group.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{group.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{group.members.length} members</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="border-b border-border/50 my-4 mx-2" />
          </div>
        )}

        <h3 className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 mt-4">Direct Messages</h3>
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
              const isSelected = selectedUserPersistentId === user.persistentId

              return (
                <div
                  key={user.sessionId}
                  data-testid="user-item"
                  data-user-name={user.displayName}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors
                    ${isSelected 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                    }
                  `}
                  onClick={() => {
                    if (connected) {
                      onSelectUser(user.persistentId)
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
                          onSelectUser(user.persistentId)
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