'use client'

import { useState, useEffect, useRef } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocket } from '@/hooks/use-websocket'

interface SessionData {
  sessionId: string
  token: string
  displayName: string
  avatar?: string
}

interface ChatMessage {
  id: string
  content: string
  fromSessionId: string
  fromDisplayName: string
  timestamp: number
  delivered?: boolean
}

interface ChatInterfaceProps {
  currentSession: SessionData
  targetUserId: string
  isConnected: boolean
}

export function ChatInterface({ 
  currentSession, 
  targetUserId, 
  isConnected 
}: ChatInterfaceProps) {
  const { addEventListener, sendMessage } = useWebSocket()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for incoming messages
  useEffect(() => {
    const cleanup1 = addEventListener('chat-message-received', (data) => {
      if (data.fromSessionId === targetUserId) {
        setMessages(prev => [...prev, {
          id: data.messageId,
          content: data.content,
          fromSessionId: data.fromSessionId,
          fromDisplayName: data.fromDisplayName,
          timestamp: data.timestamp,
        }])
      }
    })

    const cleanup2 = addEventListener('message-delivered', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, delivered: true }
          : msg
      ))
    })

    const cleanup3 = addEventListener('typing-indicator-received', (data) => {
      if (data.fromSessionId === targetUserId) {
        setOtherUserTyping(data.isTyping)
      }
    })

    return () => {
      cleanup1()
      cleanup2()
      cleanup3()
    }
  }, [addEventListener, targetUserId])

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setInputValue(value)

    if (!isTyping && value.trim()) {
      setIsTyping(true)
      sendMessage({
        type: 'typing-indicator',
        targetSessionId: targetUserId,
        isTyping: true,
      })
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false)
        sendMessage({
          type: 'typing-indicator',
          targetSessionId: targetUserId,
          isTyping: false,
        })
      }
    }, 1000)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    
    const content = inputValue.trim()
    if (!content || !isConnected) return

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Add message to local state immediately
    const newMessage: ChatMessage = {
      id: messageId,
      content,
      fromSessionId: currentSession.sessionId,
      fromDisplayName: currentSession.displayName,
      timestamp: Date.now(),
      delivered: false,
    }
    
    setMessages(prev => [...prev, newMessage])
    setInputValue('')

    // Stop typing indicator
    if (isTyping) {
      setIsTyping(false)
      sendMessage({
        type: 'typing-indicator',
        targetSessionId: targetUserId,
        isTyping: false,
      })
    }

    // Send message
    sendMessage({
      type: 'chat-message',
      targetSessionId: targetUserId,
      content,
    })
  }

  return (
    <div className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <AvatarDisplay avatarId={undefined} size="md" />
          <div>
            <h3 className="font-medium text-foreground">Chat</h3>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-muted-foreground"
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
            <p className="text-sm text-muted-foreground">
              Start your conversation by sending a message
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.fromSessionId === currentSession.sessionId
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  message-bubble max-w-xs lg:max-w-md
                  ${isOwn ? 'sent' : 'received'}
                `}>
                  <p className="text-sm">{message.content}</p>
                  <div className={`
                    flex items-center justify-between mt-1 text-xs opacity-70
                    ${isOwn ? 'text-primary-foreground' : 'text-muted-foreground'}
                  `}>
                    <span>
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    {isOwn && (
                      <span className="ml-2">
                        {message.delivered ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {/* Typing Indicator */}
        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="message-bubble received">
              <div className="typing-dots">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={isConnected ? "Type a message..." : "Connecting..."}
            disabled={!isConnected}
            className="flex-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder-muted-foreground"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || !isConnected}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}