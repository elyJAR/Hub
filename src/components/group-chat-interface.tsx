'use client'

import { useState, useEffect, useRef } from 'react'
import { AvatarDisplay } from './avatar-picker'
import { useWebSocketContext } from '@/contexts/websocket-context'
import EmojiPicker from 'emoji-picker-react'
import { MessageSquare, File, Download, Pencil, Trash2, X, SmilePlus, Paperclip, Send, Check, Users, LogOut } from 'lucide-react'
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
  fromDisplayName: string
  content: string
  timestamp: number
  status: 'sending' | 'delivered' | 'read'
  isEdited?: boolean
  isDeleted?: boolean
}

interface GroupChatInterfaceProps {
  currentSession: SessionData
  groupId: string
  groupName: string
  members: string[]
  onLeave: () => void
}

export function GroupChatInterface({ 
  currentSession, 
  groupId, 
  groupName,
  members,
  onLeave
}: GroupChatInterfaceProps) {
  const { addEventListener, sendMessage, leaveGroup } = useWebSocketContext()
  
  const getStorageKey = () => `hub-group-chat-${groupId}`

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Save messages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getStorageKey(), JSON.stringify(messages))
    }
  }, [messages, groupId])

  // Listen for group messages
  useEffect(() => {
    const cleanup = addEventListener('group-chat-message-received', (data) => {
      if (data.groupId === groupId) {
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

    const cleanupEdit = addEventListener('group-chat-message-edited', (data) => {
      if (data.groupId === groupId) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, content: data.newContent, isEdited: true }
            : msg
        ))
      }
    })

    const cleanupDelete = addEventListener('group-chat-message-deleted', (data) => {
      if (data.groupId === groupId) {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, isDeleted: true }
            : msg
        ))
      }
    })

    const cleanupJoin = addEventListener('group-user-joined', (data) => {
        if (data.groupId === groupId && data.userId !== currentSession.sessionId) {
            toast.info(`${data.displayName} joined the group`)
        }
    })

    const cleanupLeave = addEventListener('group-user-left', (data) => {
        if (data.groupId === groupId && data.userId !== currentSession.sessionId) {
            toast.info(`${data.displayName} left the group`)
        }
    })

    return () => {
      cleanup()
      cleanupEdit()
      cleanupDelete()
      cleanupJoin()
      cleanupLeave()
    }
  }, [groupId, addEventListener, currentSession.sessionId])

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim()) return

    if (editingMessageId) {
      sendMessage({
        type: 'group-chat-message-edit',
        groupId,
        messageId: editingMessageId,
        newContent: inputValue.trim(),
      })
      
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessageId 
          ? { ...msg, content: inputValue.trim(), isEdited: true }
          : msg
      ))
      
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
      content: inputValue,
      timestamp: Date.now(),
      status: 'sending'
    }

    setMessages(prev => [...prev, newMessage])
    
    sendMessage({
      type: 'group-chat-message',
      groupId,
      content: inputValue,
      id: messageId,
      timestamp: newMessage.timestamp
    })

    setInputValue('')
    setShowEmojiPicker(false)
  }

  const handleEditInitiate = (msg: Message) => {
    setEditingMessageId(msg.id)
    setInputValue(msg.content)
  }

  const handleDeleteMessage = (messageId: string) => {
    if (confirm('Are you sure you want to delete this message?')) {
      sendMessage({
        type: 'group-chat-message-delete',
        groupId,
        messageId,
      })
      
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, isDeleted: true }
          : msg
      ))
    }
  }

  const onEmojiClick = (emojiData: any) => {
    setInputValue(prev => prev + emojiData.emoji)
  }

  const handleLeaveGroup = () => {
      if (confirm(`Are you sure you want to leave ${groupName}?`)) {
          leaveGroup(groupId)
          onLeave()
      }
  }

  const copyGroupId = () => {
    navigator.clipboard.writeText(groupId)
    toast.success('Group ID copied to clipboard')
  }

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="bg-card/50 backdrop-blur-md p-4 border-b flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-tight flex items-center space-x-2">
              <span>{groupName}</span>
              <button 
                onClick={copyGroupId}
                className="text-[10px] bg-muted px-1.5 py-0.5 rounded hover:bg-muted/80 transition-colors text-muted-foreground font-mono"
                title="Click to copy Group ID"
              >
                {groupId}
              </button>
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
              {members.length} Members Online
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleLeaveGroup}
            className="p-2 hover:bg-red-500/10 text-red-500 rounded-full transition-colors group"
            title="Leave Group"
          >
            <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-primary/10">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-medium">Welcome to {groupName}</p>
              <p className="text-sm">Messages are shared with everyone in the group.</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.fromSessionId === currentSession.sessionId
            return (
              <div
                key={message.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group animate-in slide-in-from-bottom-2 duration-300`}
              >
                {!isMe && (
                  <span className="text-[10px] font-bold text-muted-foreground ml-2 mb-1 uppercase tracking-tighter">
                    {message.fromDisplayName}
                  </span>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-sm relative group-hover:shadow-md transition-shadow ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-tr-none'
                      : 'bg-card border rounded-tl-none'
                  } ${message.isDeleted ? 'opacity-50 italic' : ''}`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                    {message.isDeleted ? 'This message was deleted' : message.content}
                  </p>
                  
                  <div className={`flex items-center space-x-1 mt-1 text-[9px] ${isMe ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {message.isEdited && !message.isDeleted && <span className="italic">(edited)</span>}
                    {isMe && message.status === 'delivered' && <Check className="w-3 h-3" />}
                  </div>

                  {isMe && !message.isDeleted && (
                    <div className="absolute top-0 right-full mr-2 hidden group-hover:flex space-x-1 bg-background/80 rounded shadow-sm p-1 backdrop-blur-sm border">
                      <button 
                        onClick={() => handleEditInitiate(message)} 
                        className="p-1 text-muted-foreground hover:text-primary rounded-md transition-colors" 
                        title="Edit"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMessage(message.id)} 
                        className="p-1 text-muted-foreground hover:text-red-500 rounded-md transition-colors" 
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-card/50 border-t sticky bottom-0 z-10">
        {editingMessageId && (
          <div className="mb-2 flex items-center justify-between bg-primary/10 p-2 rounded-lg border border-primary/20 animate-in slide-in-from-bottom-2">
            <div className="flex items-center space-x-2">
              <Pencil className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-primary">Editing message</span>
            </div>
            <button 
              onClick={() => {
                setEditingMessageId(null)
                setInputValue('')
              }}
              className="p-1 hover:bg-primary/20 rounded-full transition-colors"
            >
              <X className="w-3 h-3 text-primary" />
            </button>
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
          <div className="flex-1 relative bg-background/50 border rounded-2xl transition-all focus-within:ring-2 focus-within:ring-primary/20">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Type a message..."
              className="w-full bg-transparent border-none focus:ring-0 resize-none py-3 px-4 pr-12 text-sm max-h-32 scrollbar-none"
              rows={1}
            />
            <div className="absolute right-2 bottom-1.5 flex items-center space-x-1">
              <div ref={emojiPickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                >
                  <SmilePlus className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-4 z-50">
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-primary/20 active:scale-95"
          >
            {editingMessageId ? <Check className="w-5 h-5" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  )
}
