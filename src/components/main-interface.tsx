'use client'

import { useState } from 'react'
import { UserList } from './user-list'
import { ChatInterface } from './chat-interface'
import { ConnectionRequestModal, ConnectionRequestToast } from './connection-request-modal'
import { useConnectionRequests } from '@/hooks/use-connection-requests'

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
      {/* Sidebar - User List */}
      <div className={`
        ${isSidebarOpen ? 'w-80' : 'w-0'} 
        transition-all duration-300 ease-in-out
        bg-card border-r border-border flex-shrink-0 overflow-hidden
        lg:relative absolute lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        z-30 lg:z-auto
      `}>
        <UserList
          currentSession={session}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
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
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Title */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                />
              </svg>
              {hasRequests && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {pendingRequests.length}
                  </span>
                </div>
              )}
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
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
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
    </div>
  )
}