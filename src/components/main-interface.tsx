'use client'

import { useState, useEffect } from 'react'
import { UserList } from './user-list'
import { ChatInterface } from './chat-interface'
import { ConnectionRequestModal, ConnectionRequestToast } from './connection-request-modal'
import { SettingsModal } from './settings-modal'
import { CallInterface } from './call-interface'
import { useConnectionRequests } from '@/hooks/use-connection-requests'
import { useWebRTC } from '@/hooks/use-webrtc'
import { Menu, Users, Bell, Settings, Inbox } from 'lucide-react'

interface SessionData {
  sessionId: string
  token: string
  displayName: string
  avatar?: string
}

interface MainInterfaceProps {
  session: SessionData
  isConnected: boolean
}

export function MainInterface({ session, isConnected }: MainInterfaceProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>()
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // WebRTC hook for voice calls
  const {
    isInCall,
    isCallIncoming,
    isMuted,
    callDuration,
    remoteUserId,
    remoteUserName,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  } = useWebRTC()

  // Auto-close sidebar on mobile devices initially
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }, [])
  
  const {
    pendingRequests,
    currentToast,
    acceptRequest,
    declineRequest,
    dismissToast,
    hasRequests,
  } = useConnectionRequests()

  const handleToastAccept = () => {
    if (currentToast) {
      acceptRequest(currentToast.requestId)
    }
  }

  const handleToastDecline = () => {
    if (currentToast) {
      declineRequest(currentToast.requestId)
    }
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - User List */}
      <div className={`
        ${isSidebarOpen ? 'w-[85vw] sm:w-80' : 'w-0'} 
        transition-all duration-300 ease-in-out
        bg-card border-r border-border flex-shrink-0 overflow-hidden
        h-full
        fixed inset-y-0 left-0 lg:relative lg:translate-x-0 
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        z-30 lg:z-auto
      `}>
        <UserList
          currentSession={session}
          selectedUserId={selectedUserId}
          onSelectUser={(userId) => {
            setSelectedUserId(userId)
            if (window.innerWidth < 1024) {
              setIsSidebarOpen(false)
            }
          }}
          onStartCall={startCall}
          isConnected={isConnected}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Users className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Hub</h1>
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Connection Requests Button */}
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className={`
                relative p-2 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary
                ${hasRequests ? 'text-primary' : 'text-muted-foreground'}
              `}
              title="Connection Requests"
            >
              <Bell className="w-5 h-5" />
              {hasRequests && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {pendingRequests.length}
                  </span>
                </div>
              )}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>

            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          {selectedUserId ? (
            <ChatInterface
              currentSession={session}
              targetUserId={selectedUserId}
              isConnected={isConnected}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/20">
              <div className="text-center max-w-md mx-auto p-6">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Welcome to Hub, {session.displayName}!
                </h3>
                <p className="text-muted-foreground mb-4">
                  Select a user from the sidebar to start a conversation, or send a connection request to someone new.
                </p>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="lg:hidden bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                >
                  View Users
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Connection Request Modal */}
      <ConnectionRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />

      {/* Connection Request Toast */}
      <ConnectionRequestToast
        request={currentToast}
        onAccept={handleToastAccept}
        onDecline={handleToastDecline}
        onDismiss={dismissToast}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        session={session}
      />

      {/* Call Interface */}
      {(isInCall || isCallIncoming) && (
        <CallInterface
          isIncoming={isCallIncoming}
          remoteUserName={remoteUserName || 'Unknown User'}
          remoteAvatar={undefined}
          callDuration={callDuration}
          isMuted={isMuted}
          onAccept={acceptCall}
          onDecline={declineCall}
          onEnd={endCall}
          onToggleMute={toggleMute}
        />
      )}
    </div>
  )
}