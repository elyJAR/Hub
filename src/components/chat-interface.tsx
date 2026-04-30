'use client'

import { useState, useEffect, useRef } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocketContext } from '@/contexts/websocket-context'
import EmojiPicker from 'emoji-picker-react'
import { MessageSquare, File, Download, Pencil, Trash2, X, SmilePlus, Paperclip, Send, Check } from 'lucide-react'

interface SessionData {
  sessionId: string
  token: string
  displayName: string
  avatar?: string
}

interface Message {
  id: string
  fromSessionId: string
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
  isConnected: boolean
}

export function ChatInterface({ 
  currentSession, 
  targetUserId, 
  isConnected 
}: ChatInterfaceProps) {
  const { addEventListener, sendMessage } = useWebSocketContext()
  const [messages, setMessages] = useState<Message[]>([])
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
    })

    const cleanup7 = addEventListener('chat-message-deleted-confirm', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, isDeleted: true }
          : msg
      ))
    })

    const cleanupTyping = addEventListener('typing-indicator-received', (data) => {
      if (data.fromSessionId === targetUserId) {
        setOtherUserTyping(data.isTyping)
      }
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
      }
    })

    const cleanupFileRes = addEventListener('file-transfer-response', async (data) => {
      if (data.fromSessionId === targetUserId) {
        if (data.accepted) {
          // File accepted, send data
          const file = pendingFilesRef.current.get(data.requestId)
          if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
              const base64Data = e.target?.result as string
              sendMessage({
                type: 'file-transfer-data',
                targetSessionId: targetUserId,
                fileId: data.requestId,
                fileName: file.name,
                fileType: file.type,
                data: base64Data
              } as any)
              
              setMessages(prev => prev.map(msg => 
                msg.id === data.requestId ? { ...msg, content: `Sent file: ${file.name}`, fileData: { ...msg.fileData!, transferStatus: 'completed' } } : msg
              ))
              pendingFilesRef.current.delete(data.requestId)
            }
            reader.readAsDataURL(file)
          }
        } else {
          // Declined
          setMessages(prev => prev.map(msg => 
            msg.id === data.requestId ? { ...msg, content: `File transfer declined: ${msg.fileData?.fileName}`, fileData: { ...msg.fileData!, transferStatus: 'declined' } } : msg
          ))
          pendingFilesRef.current.delete(data.requestId)
        }
      }
    })

    const cleanupFileData = addEventListener('file-transfer-data', (data) => {
      if (data.fromSessionId === targetUserId) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.fileId ? { 
            ...msg, 
            content: `Received file: ${data.fileName}`,
            type: 'file-transfer',
            fileData: { 
              ...msg.fileData!, 
              transferStatus: 'completed',
              dataUrl: data.data
            } 
          } : msg
        ))
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
      cleanupFileData()
    }
  }, [addEventListener, targetUserId, sendMessage])

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !isConnected) return

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large! For now, only files under 5MB are supported.")
      return
    }

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
    } as any)

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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileResponse = (fileId: string, accepted: boolean) => {
    sendMessage({
      type: 'file-transfer-response',
      targetSessionId: targetUserId,
      requestId: fileId,
      accepted
    } as any)

    setMessages(prev => prev.map(msg => 
      msg.id === fileId 
        ? { ...msg, fileData: { ...msg.fileData!, transferStatus: accepted ? 'completed' : 'declined' } }
        : msg
    ))
  }

  return (
    <div className="h-full flex flex-col">
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
                          <button onClick={() => handleFileResponse(message.fileData!.fileId, true)} className="flex-1 text-xs py-1 px-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Accept</button>
                          <button onClick={() => handleFileResponse(message.fileData!.fileId, false)} className="flex-1 text-xs py-1 px-2 bg-red-500 text-white rounded hover:bg-red-600 transition">Decline</button>
                        </div>
                      )}
                      
                      {message.fileData.transferStatus === 'declined' && (
                        <p className="text-xs text-red-400 italic">Transfer declined</p>
                      )}
                      {message.fileData.transferStatus === 'completed' && isCurrentUser && (
                        <p className="text-xs text-green-400 italic">Transfer complete</p>
                      )}
                    </div>
                  ) : message.type === 'file-transfer' && message.fileData?.dataUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 bg-background/20 p-2 rounded">
                        <Download className="w-6 h-6" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{message.fileData.fileName}</p>
                          <p className="text-xs opacity-70">{(message.fileData.fileSize / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <a href={message.fileData.dataUrl} download={message.fileData.fileName} className="block w-full text-center text-xs py-1.5 px-2 bg-primary-foreground/20 text-current rounded hover:bg-primary-foreground/30 transition">
                        Download File
                      </a>
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
      <div className="p-4 border-t border-border bg-card relative">
        {/* Emoji Picker Popover */}
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