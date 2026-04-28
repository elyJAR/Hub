'use client'

import { useEffect, useState } from 'react'
import { JoinScreen } from '@/components/join-screen'
import { MainInterface } from '@/components/main-interface'
import { WebSocketProvider, useWebSocketContext } from '@/contexts/websocket-context'
import { LoadingScreen } from '@/components/loading-screen'
import { ErrorScreen } from '@/components/error-screen'

function HomePageContent() {
  const [hasJoined, setHasJoined] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const { 
    isConnected, 
    error, 
    session, 
    joinSession, 
    reconnect 
  } = useWebSocketContext()

  useEffect(() => {
    // Check if user was previously connected (from localStorage)
    const savedSession = localStorage.getItem('hub-session')
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession)
        // Attempt to reconnect with saved session
        reconnect(sessionData.token)
      } catch (error) {
        console.error('Failed to restore session:', error)
        localStorage.removeItem('hub-session')
      }
    }
    setIsLoading(false)
  }, [reconnect])

  useEffect(() => {
    // Save session to localStorage when user joins
    if (session) {
      localStorage.setItem('hub-session', JSON.stringify(session))
      setHasJoined(true)
    }
  }, [session])

  const handleJoin = async (displayName: string, avatar?: string) => {
    try {
      await joinSession(displayName, avatar)
    } catch (error) {
      console.error('Failed to join session:', error)
    }
  }

  const handleRetry = () => {
    window.location.reload()
  }

  if (isLoading) {
    return <LoadingScreen message="Connecting to Hub..." />
  }

  if (error && !isConnected) {
    return (
      <ErrorScreen 
        title="Connection Failed"
        message={error}
        onRetry={handleRetry}
      />
    )
  }

  if (!hasJoined || !session) {
    return (
      <JoinScreen 
        onJoin={handleJoin}
        isConnecting={!isConnected}
        error={error}
      />
    )
  }

  return (
    <MainInterface 
      session={session}
      isConnected={isConnected}
    />
  )
}

export default function HomePage() {
  return (
    <WebSocketProvider>
      <HomePageContent />
    </WebSocketProvider>
  )
}