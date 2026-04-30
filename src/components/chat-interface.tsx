'use client'

import { useState, useEffect, useRef } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { useWebRTCFileTransfer } from '@/hooks/use-webrtc-file'
import EmojiPicker from 'emoji-picker-react'
import { MessageSquare, File, Download, Pencil, Trash2, X, SmilePlus, Paperclip, Send, Check, Phone } from 'lucide-react'
import { toast } from '@/lib/toast'

interface SessionData {
  sessionId: string
  persistentId: string
  token: string
  displayName: string
  avatar?: string
}

interface Message {
  id: string
  fromSessionId: string
  fromPersistentId?: string
  fromDisplayName: string
  content: string
  timestamp: number
  status: 'sending' | 'delivered' | 'read'
  isEdited?: boolean
  isDeleted?: boolean
  type?: 'text' | 'file-offer' | 'file-transfer'
  fileData?: {
    fileId: string
    fileName: string
    fileSize: number
    fileType: string
    transferStatus?: 'pending' | 'accepted' | 'declined' | 'completed'
    dataUrl?: string
  }
}

interface ChatInterfaceProps {
  currentSession: SessionData
  targetUserId: string
  targetPersistentId: string
  targetUser?: {
    displayName: string
    avatar?: string
    status?: string
    persistentId: string
  }
  isConnected: boolean
  onStartCall?: (userId: string) => void
}

export function ChatInterface({ 
  currentSession, 
  targetUserId, 
  targetPersistentId,
  targetUser,
  isConnected,
  onStartCall
}: ChatInterfaceProps) {
  const { addEventListener, sendMessage } = useWebSocketContext()
  const { startWebRTCFileTransfer, expectIncomingFile, transfers } = useWebRTCFileTransfer()
  
  const getStorageKey = () => `hub-chat-${currentSession.persistentId}-${targetPersistentId}`

  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(getStorageKey())
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse saved messages', e)
        }
      }
    }
    return []
  })
  const [inputValue, setInputValue] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [otherUserTyping, setOtherUserTyping] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingFilesRef = useRef<Map<string, File>>(new Map())

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save messages to local storage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getStorageKey(), JSON.stringify(messages))
    }
  }, [messages, currentSession.persistentId, targetPersistentId])

  // Listen for incoming messages
  useEffect(() => {
    const cleanup1 = addEventListener('chat-message-received', (data) => {
      // Use persistentId to match the conversation
      if (data.fromPersistentId === targetPersistentId) {
        setMessages(prev => [...prev, {
          id: data.messageId,
          content: data.content,
          fromSessionId: data.fromSessionId,
          fromPersistentId: data.fromPersistentId,
          fromDisplayName: data.fromDisplayName,
          timestamp: data.timestamp,
          status: 'delivered'
        }])
      }
    })

    const cleanup3 = addEventListener('message-delivered', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, status: 'delivered' }
          : msg
      ))
    })

    const cleanup4 = addEventListener('chat-message-edited', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, content: data.newContent, isEdited: true }
          : msg
      ))
      toast.info('Message edited')
    })

    const cleanup5 = addEventListener('chat-message-edited-confirm', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, content: data.newContent, isEdited: true }
          : msg
      ))
    })

    const cleanup6 = addEventListener('chat-message-deleted', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, isDeleted: true }
          : msg
      ))
      toast.info('Message deleted')
    })

    const cleanup7 = addEventListener('chat-message-deleted-confirm', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, isDeleted: true }
          : msg
      ))
    })

    const cleanupFileReq = addEventListener('incoming-file-transfer-request', (data) => {
      if (data.fromSessionId === targetUserId) {
        setMessages(prev => [...prev, {
          id: data.requestId,
          fromSessionId: data.fromSessionId,
          fromDisplayName: data.fromDisplayName,
          content: `Offered to send a file: ${data.fileName}`,
          timestamp: Date.now(),
          status: 'delivered',
          type: 'file-offer',
          fileData: {
            fileId: data.requestId,
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileType: data.fileType,
            transferStatus: 'pending'
          }
        }])
        toast.info(`${data.fromDisplayName} wants to send you a file`)
      }
    })

    const cleanupFileRes = addEventListener('file-transfer-response', async (data) => {
      if (data.fromSessionId === targetUserId && data.accepted) {
        // Trigger WebRTC transfer if we have the file
        const file = pendingFilesRef.current.get(data.requestId)
        if (file) {
          startWebRTCFileTransfer(targetUserId, data.requestId, file)
          pendingFilesRef.current.delete(data.requestId)
        }
        
        setMessages(prev => prev.map(msg => 
          msg.id === data.requestId ? { ...msg, fileData: { ...msg.fileData!, transferStatus: 'accepted' } } : msg
        ))
      }
    })

    const cleanupTyping = addEventListener('typing-indicator-received', (data) => {
      if (data.fromSessionId === targetUserId) {
        setOtherUserTyping(data.isTyping)
      }
    })

    return () => {
      cleanup1()
      cleanup3()
      cleanup4()
      cleanup5()
      cleanup6()
      cleanup7()
      cleanupTyping()
      cleanupFileReq()
      cleanupFileRes()
    }
  }, [addEventListener, targetUserId, sendMessage, startWebRTCFileTransfer])

  // Close emoji picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
      }
    }
    
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmojiPicker])

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

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

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
    
    if (!inputValue.trim() || !isConnected) return
    
    if (editingMessageId) {
      sendMessage({
        type: 'chat-message-edit',
        targetSessionId: targetUserId,
        messageId: editingMessageId,
        newContent: inputValue.trim(),
      })
      setEditingMessageId(null)
      setInputValue('')
      setShowEmojiPicker(false)
      return
    }

    const messageId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const newMessage: Message = {
      id: messageId,
      fromSessionId: currentSession.sessionId,
      fromDisplayName: currentSession.displayName,
      content: inputValue.trim(),
      timestamp: Date.now(),
      status: 'sending',
    }
    
    setMessages(prev => [...prev, newMessage])
    setInputValue('')
    setShowEmojiPicker(false)

    if (isTyping) {
      setIsTyping(false)
      sendMessage({
        type: 'typing-indicator',
        targetSessionId: targetUserId,
        isTyping: false,
      })
    }

    sendMessage({
      type: 'chat-message',
      targetSessionId: targetUserId,
      content: newMessage.content,
      messageId: newMessage.id
    })
  }

  const handleEditInitiate = (msg: Message) => {
    setEditingMessageId(msg.id)
    setInputValue(msg.content)
  }

  const handleDeleteMessage = (messageId: string) => {
    sendMessage({
      type: 'chat-message-delete',
      targetSessionId: targetUserId,
      messageId: messageId,
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | File[] } }) => {
    const file = e.target.files?.[0]
    if (!file || !isConnected) return

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    pendingFilesRef.current.set(fileId, file)

    // Send request
    sendMessage({
      type: 'file-transfer-request',
      targetSessionId: targetUserId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      id: fileId,
    })

    // Add local message
    const newMessage: Message = {
      id: fileId,
      fromSessionId: currentSession.sessionId,
      fromDisplayName: currentSession.displayName,
      content: `Offering file: ${file.name}`,
      timestamp: Date.now(),
      status: 'sending',
      type: 'file-offer',
      fileData: {
        fileId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        transferStatus: 'pending'
      }
    }
    
    setMessages(prev => [...prev, newMessage])
    toast.info('File transfer request sent')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileResponse = (fileId: string, accepted: boolean) => {
    const msg = messages.find(m => m.id === fileId)
    if (accepted && msg && msg.fileData) {
      expectIncomingFile(fileId, msg.fileData.fileSize, msg.fileData.fileType, msg.fileData.fileName)
    }

    sendMessage({
      type: 'file-transfer-response',
      targetSessionId: targetUserId,
      requestId: fileId,
      accepted
    })

    setMessages(prev => prev.map(msg => 
      msg.id === fileId 
        ? { ...msg, fileData: { ...msg.fileData!, transferStatus: accepted ? 'accepted' : 'declined' } }
        : msg
    ))
    
    if (accepted) {
      toast.success('File transfer accepted')
    } else {
      toast.info('File transfer declined')
    }
  }

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect({ target: { files: [file] } } as any)
    }
  }

  return (
    <div 
      className={`h-full flex flex-col relative ${isDragging ? 'bg-primary/5' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] z-50 flex items-center justify-center border-2 border-dashed border-primary m-2 rounded-xl pointer-events-none">
          <div className="bg-background/90 p-6 rounded-2xl shadow-xl flex flex-col items-center space-y-3 scale-110 transition-transform">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
              <Paperclip className="w-8 h-8 text-primary animate-bounce" />
            </div>
            <p className="font-bold text-lg text-primary">Drop to send file</p>
            <p className="text-sm text-muted-foreground text-center max-w-[200px]">
              Files will be sent directly to {targetUser?.displayName}
            </p>
          </div>
        </div>
      )}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <AvatarDisplay avatarId={targetUser?.avatar} size="md" />
          <div>
            <h3 className="font-medium text-foreground">{targetUser?.displayName || 'Chat'}</h3>
            <p className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
        
        {onStartCall && targetUser?.status !== 'in-call' && (
          <button
            onClick={() => onStartCall(targetUserId)}
            className="flex items-center space-x-2 text-sm bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
            title="Start voice call"
          >
            <Phone className="w-4 h-4" />
            <span className="hidden sm:inline">Call</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Start your conversation</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.fromSessionId === currentSession.sessionId
            const showAvatar = index === 0 || messages[index - 1].fromSessionId !== message.fromSessionId
            const transfer = transfers[message.id]

            return (
              <div
                key={message.id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}
              >
                {!isCurrentUser && (
                  <div className="w-8 flex-shrink-0 mr-2">
                    {showAvatar && <AvatarDisplay avatarId={undefined} size="md" />}
                  </div>
                )}
                
                <div
                  className={`
                    max-w-[70%] rounded-2xl px-4 py-2 relative
                    ${isCurrentUser
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm'
                    }
                    ${message.isDeleted ? 'opacity-50 italic' : ''}
                  `}
                >
                  {message.type === 'file-offer' && message.fileData ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 bg-background/20 p-2 rounded">
                        <File className="w-6 h-6" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.fileData.fileName}</p>
                          <p className="text-xs opacity-70">{(message.fileData.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      
                      {!isCurrentUser && message.fileData.transferStatus === 'pending' && (
                        <div className="flex space-x-2 mt-2">
                          <button 
                            onClick={() => handleFileResponse(message.id, true)} 
                            className="flex-1 text-xs py-1 px-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={() => handleFileResponse(message.id, false)} 
                            className="flex-1 text-xs py-1 px-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                          >
                            Decline
                          </button>
                        </div>
                      )}
                      
                      {message.fileData.transferStatus === 'declined' && (
                        <p className="text-xs text-red-400 italic">Transfer declined</p>
                      )}

                      {transfer && transfer.status === 'transferring' && (
                        <div className="w-full bg-black/20 rounded-full h-1.5 mt-2 overflow-hidden">
                          <div 
                            className="bg-blue-400 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${transfer.progress}%` }}
                          />
                        </div>
                      )}

                      {transfer && transfer.status === 'error' && (
                        <p className="text-xs text-red-500 italic mt-1">{transfer.error}</p>
                      )}

                      {(message.fileData.dataUrl || transfer?.dataUrl) && (
                        <a 
                          href={message.fileData.dataUrl || transfer?.dataUrl} 
                          download={`Hub_Downloads_${message.fileData?.fileName}`} 
                          className={`mt-2 text-xs text-center py-1.5 px-2 rounded transition-colors flex items-center justify-center space-x-1 ${
                            isCurrentUser 
                              ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground' 
                              : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }`}
                          onClick={() => {
                            toast.success(`Downloading to your Downloads folder as Hub_Downloads_${message.fileData?.fileName}`)
                          }}
                        >
                          <Download className="w-3 h-3" />
                          <span>Download File</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="break-words">
                      {message.isDeleted ? 'This message was deleted' : message.content}
                    </p>
                  )}
                  
                  <div className={`flex items-center mt-1 space-x-1 text-[10px] ${
                    isCurrentUser ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'
                  }`}>
                    <span>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.isEdited && !message.isDeleted && <span className="italic ml-1">(edited)</span>}
                    {isCurrentUser && !message.isDeleted && (
                      <span className="ml-1">
                        {message.status === 'sending' && '·'}
                        {message.status === 'delivered' && '✓'}
                        {message.status === 'read' && '✓✓'}
                      </span>
                    )}
                  </div>

                  {isCurrentUser && !message.isDeleted && (
                    <div className="absolute top-0 right-full mr-2 hidden group-hover:flex space-x-1 bg-background/80 rounded shadow-sm p-1">
                      <button onClick={() => handleEditInitiate(message)} className="p-1 text-muted-foreground hover:text-primary rounded-md transition-colors" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteMessage(message.id)} className="p-1 text-muted-foreground hover:text-red-500 rounded-md transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}

        {otherUserTyping && (
          <div className="flex justify-start">
            <div className="bg-muted text-foreground rounded-2xl rounded-tl-sm px-4 py-2 typing-dots">
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-card relative">
        {showEmojiPicker && (
          <div className="absolute bottom-[80px] right-4 z-50 shadow-xl rounded-lg" ref={emojiPickerRef}>
            <EmojiPicker 
              onEmojiClick={(emojiData) => {
                setInputValue(prev => prev + emojiData.emoji)
              }}
              theme={'auto' as any}
            />
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          {editingMessageId && (
            <button
              type="button"
              onClick={() => {
                setEditingMessageId(null)
                setInputValue('')
              }}
              className="p-2 text-muted-foreground hover:text-red-500 rounded-md transition-colors"
              title="Cancel Edit"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!isConnected}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
            title="Attach File"
          >
            <Paperclip className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={!isConnected}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
            title="Add Emoji"
          >
            <SmilePlus className="w-6 h-6" />
          </button>
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={editingMessageId ? "Edit message..." : (isConnected ? "Type a message..." : "Connecting...")}
            disabled={!isConnected}
            className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground placeholder-muted-foreground ${editingMessageId ? 'border-primary ring-1 ring-primary' : 'border-input'}`}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || !isConnected}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {editingMessageId ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}