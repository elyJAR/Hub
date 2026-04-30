'use client'

import { useState, useEffect, useRef } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { useWebRTCFileTransfer } from '@/hooks/use-webrtc-file'
import EmojiPicker from 'emoji-picker-react'
import { MessageSquare, File, Download, Pencil, Trash2, X, SmilePlus, Paperclip, Send, Check, Phone, CircleSlash, Loader2 } from 'lucide-react'
import { toast } from '@/lib/toast'

const BANNED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.scr']

// Global store for files during signaling to survive remounts and HMR
if (typeof window !== 'undefined' && !(window as any).globalPendingFiles) {
  (window as any).globalPendingFiles = new Map<string, File>()
}
const getGlobalPendingFiles = () => {
  if (typeof window !== 'undefined') {
    return (window as any).globalPendingFiles as Map<string, File>
  }
  return new Map<string, File>()
}

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
  const { 
    transfers, 
    startWebRTCFileTransfer, 
    expectIncomingFile, 
    cancelTransfer,
    setWritableStream 
  } = useWebRTCFileTransfer()
  
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
      if (data.fromPersistentId === targetPersistentId) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, content: data.newContent, isEdited: true }
            : msg
        ))
        toast.info('Message edited')
      }
    })

    const cleanup5 = addEventListener('chat-message-edited-confirm', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, content: data.newContent, isEdited: true }
          : msg
      ))
    })

    const cleanup6 = addEventListener('chat-message-deleted', (data) => {
      if (data.fromPersistentId === targetPersistentId) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, isDeleted: true }
            : msg
        ))
        toast.info('Message deleted')
      }
    })

    const cleanup7 = addEventListener('chat-message-deleted-confirm', (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, isDeleted: true }
          : msg
      ))
    })

    const cleanupFileReq = addEventListener('incoming-file-transfer-request', (data) => {
      console.log('[ChatInterface] Received incoming-file-transfer-request:', data)
      if (data.fromSessionId === targetUserId || data.fromPersistentId === targetPersistentId) {
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
      console.log('[ChatInterface] Received file-transfer-response:', data)
      // Check both sessionId and persistentId for robustness
      if ((data.fromSessionId === targetUserId || data.fromPersistentId === targetPersistentId) && data.accepted) {
        console.log('[ChatInterface] Transfer accepted by receiver. Looking for file in globalPendingFiles...')
        const file = getGlobalPendingFiles().get(data.requestId)
        if (file) {
          console.log('[ChatInterface] File found. Starting WebRTC transfer...')
          startWebRTCFileTransfer(targetUserId, data.requestId, file)
          
          // Create local URL for the sender to be able to "Open" it too
          const localUrl = URL.createObjectURL(file)
          setMessages(prev => prev.map(msg => 
            msg.id === data.requestId 
              ? { ...msg, fileData: { ...msg.fileData!, dataUrl: localUrl, transferStatus: 'accepted' } }
              : msg
          ))
          
          getGlobalPendingFiles().delete(data.requestId)
        } else {
          console.error('[ChatInterface] File NOT found in globalPendingFiles for requestId:', data.requestId)
        }
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
  }, [addEventListener, targetUserId, targetPersistentId, sendMessage, startWebRTCFileTransfer])

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

    // 2. Type Validation (Security)
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (BANNED_EXTENSIONS.includes(fileExtension)) {
      toast.error(`File type not allowed for security reasons (${fileExtension})`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    getGlobalPendingFiles().set(fileId, file)

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
  }

  const handleFileResponse = async (messageId: string, accepted: boolean) => {
    console.log('[ChatInterface] handleFileResponse called:', { messageId, accepted })
    const message = messages.find(m => m.id === messageId)
    if (!message || !message.fileData) {
      console.error('[ChatInterface] handleFileResponse: Message or fileData not found', messageId)
      return
    }

    if (accepted) {
      try {
        console.log('[ChatInterface] Receiver accepted file. Checking for showSaveFilePicker...')
        // Try to use File System Access API for "Specify location"
        if ('showSaveFilePicker' in window) {
          console.log('[ChatInterface] showSaveFilePicker is available. Opening picker...')
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: message.fileData.fileName,
            types: [{
              description: 'File',
              accept: { [message.fileData.fileType || 'application/octet-stream']: ['.' + message.fileData.fileName.split('.').pop()] },
            }],
          })
          
          console.log('[ChatInterface] File handle acquired. Creating writable...')
          // Create a writable stream to the file
          const writable = await handle.createWritable()
          setWritableStream(message.fileData.fileId, writable)
          
          toast.success('Location selected. Transfer starting...')
        } else {
          console.log('[ChatInterface] showSaveFilePicker NOT available. Using Blob fallback.')
          toast.info('Direct-to-disk not supported in this browser. Using standard download.')
        }
      } catch (err) {
        // User cancelled picker or not supported, continue with default
        console.log('[ChatInterface] File picker skipped or failed:', err)
        toast.info('Using default download location.')
      }

      console.log('[ChatInterface] Calling expectIncomingFile...')
      expectIncomingFile(
        message.fileData.fileId,
        message.fileData.fileSize,
        message.fileData.fileType,
        message.fileData.fileName
      )
    }

    console.log('[ChatInterface] Sending file-transfer-response via WebSocket...')
    sendMessage({
      type: 'file-transfer-response',
      targetSessionId: targetUserId,
      requestId: messageId,
      accepted,
      fromPersistentId: currentSession.persistentId
    })

    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
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
            onClick={() => {
              console.log('[ChatInterface] Call button clicked for targetUserId:', targetUserId)
              onStartCall(targetUserId)
            }}
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
                        <div className="flex flex-col space-y-2 mt-2">
                          <p className="text-[10px] text-center font-medium opacity-70">Incoming file request</p>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleFileResponse(message.id, true)} 
                              className="flex-1 text-xs py-1.5 px-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-sm font-medium flex items-center justify-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Accept</span>
                            </button>
                            <button 
                              onClick={() => handleFileResponse(message.id, false)} 
                              className="flex-1 text-xs py-1.5 px-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-sm font-medium flex items-center justify-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {isCurrentUser && message.fileData.transferStatus === 'pending' && (
                        <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center space-x-2">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                          <span className="text-[10px] font-medium text-blue-400">Waiting for receiver to accept...</span>
                        </div>
                      )}
                      
                      {message.fileData.transferStatus === 'accepted' && !transfer && (
                        <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center space-x-2">
                          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                          <span className="text-[10px] font-medium text-blue-400">Initializing P2P Connection...</span>
                        </div>
                      )}
                      
                      {message.fileData.transferStatus === 'declined' && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 text-red-400">
                          <X className="w-3.5 h-3.5" />
                          <p className="text-[10px] italic">Transfer declined</p>
                        </div>
                      )}

                      {transfer && transfer.status === 'transferring' && (
                        <div className="mt-3 p-3 bg-black/10 rounded-xl border border-white/10 space-y-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium px-1">
                            <span>Transferring...</span>
                            <span>{transfer.progress}%</span>
                          </div>
                          <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(59,130,246,0.5)]" 
                              style={{ width: `${transfer.progress}%` }}
                            />
                          </div>
                          <button
                            onClick={() => cancelTransfer(message.id)}
                            className="flex items-center justify-center space-x-1 w-full text-[10px] py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors border border-red-500/20"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      )}

                      {transfer && transfer.status === 'error' && (
                        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center space-x-2 text-red-400">
                          <CircleSlash className="w-3.5 h-3.5" />
                          <p className="text-[10px] italic">{transfer.error}</p>
                        </div>
                      )}

                      {(message.fileData.dataUrl || transfer?.dataUrl) && (
                        <div className="mt-3 flex flex-col space-y-2">
                          <div className="flex items-center space-x-2 p-2 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <div className="bg-green-500/20 p-1.5 rounded-lg">
                              <Check className="w-4 h-4 text-green-400" />
                            </div>
                            <span className="text-[10px] font-medium text-green-400 uppercase tracking-wider">Transfer Complete</span>
                          </div>
                          
                          <div className="flex space-x-2">
                            <a 
                              href={message.fileData.dataUrl || transfer?.dataUrl} 
                              download={message.fileData?.fileName} 
                              className={`flex-1 text-[11px] font-bold text-center py-2.5 px-3 rounded-xl transition-all flex items-center justify-center space-x-1.5 shadow-lg active:scale-95 ${
                                isCurrentUser 
                                  ? 'bg-primary-foreground text-primary hover:bg-primary-foreground/90' 
                                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                              }`}
                              onClick={() => {
                                toast.success('Saving file to your computer...')
                              }}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Save File</span>
                            </a>
                            
                            <button 
                              onClick={() => {
                                const url = message.fileData?.dataUrl || transfer?.dataUrl;
                                if (url) window.open(url, '_blank');
                              }}
                              className={`px-4 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center shadow-lg active:scale-95 bg-background/50 border hover:bg-background/80`}
                              title="Open/Preview File"
                            >
                              Open
                            </button>
                          </div>
                        </div>
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