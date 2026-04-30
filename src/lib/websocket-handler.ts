import { WebSocket, RawData } from 'ws'
import crypto from 'crypto'
import { SessionManager, SessionData } from './session-manager'
import { WebSocketMessageSchema, WebSocketMessage } from '@/types/messages'
import { RateLimiter } from './rate-limiter'

export class WebSocketMessageHandler {
  private sessionManager: SessionManager
  private rateLimiter: RateLimiter
  private socketToSession = new Map<WebSocket, string>()
  private pendingRequests = new Map<string, { fromSessionId: string; toSessionId: string; expiresAt: number }>()

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager
    this.rateLimiter = new RateLimiter()
    
    // Clean up expired requests every 30 seconds
    setInterval(() => {
      const now = Date.now()
      for (const [requestId, request] of this.pendingRequests) {
        if (request.expiresAt <= now) {
          this.pendingRequests.delete(requestId)
        }
      }
    }, 30000)
  }

  handleConnection(ws: WebSocket): void {
    // Connection established, but no session created yet
    // Session will be created when user sends join message
    console.log('WebSocket connection established, waiting for join message')
  }

  handleMessage(ws: WebSocket, data: RawData): void {
    try {
      // Convert RawData to string
      const messageString = data instanceof Buffer 
        ? data.toString() 
        : Array.isArray(data)
        ? Buffer.concat(data).toString()
        : data.toString()
      
      const rawMessage = JSON.parse(messageString)
      
      // Handle join message first (special case - no validation against main schema)
      if (rawMessage.type === 'join') {
        this.handleJoinMessage(ws, rawMessage)
        return
      }
      
      // Validate message format for all other messages
      const validationResult = WebSocketMessageSchema.safeParse(rawMessage)
      if (!validationResult.success) {
        this.sendError(ws, 'INVALID_MESSAGE', 'Message validation failed', validationResult.error)
        return
      }

      const message = validationResult.data
      
      // Get session for this socket
      const sessionId = this.socketToSession.get(ws)

      // For all other messages, require valid session
      if (!sessionId) {
        this.sendError(ws, 'NO_SESSION', 'No active session. Send join message first.')
        return
      }

      const session = this.sessionManager.getSession(sessionId)
      if (!session) {
        this.sendError(ws, 'SESSION_NOT_FOUND', 'Session not found')
        return
      }

      // Check rate limits
      if (!this.rateLimiter.checkLimit(sessionId, message.type)) {
        this.sendError(ws, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded')
        return
      }

      // Update last activity
      this.sessionManager.updateLastActivity(sessionId)

      // Route message based on type
      this.routeMessage(session, message)

    } catch (error) {
      console.error('Error handling WebSocket message:', error)
      this.sendError(ws, 'INTERNAL_ERROR', 'Internal server error')
    }
  }

  handleDisconnection(ws: WebSocket): void {
    const sessionId = this.socketToSession.get(ws)
    if (sessionId) {
      console.log(`Session ${sessionId} disconnected`)
      this.sessionManager.removeSession(sessionId)
      this.socketToSession.delete(ws)
      this.broadcastPresenceUpdate()
    }
  }

  private handleJoinMessage(ws: WebSocket, message: any): void {
    try {
      // Validate join message
      if (!message.displayName || typeof message.displayName !== 'string') {
        this.sendError(ws, 'INVALID_DISPLAY_NAME', 'Display name is required')
        return
      }

      if (message.displayName.length < 3 || message.displayName.length > 50) {
        this.sendError(ws, 'INVALID_DISPLAY_NAME', 'Display name must be 3-50 characters')
        return
      }

      // Check if display name is already taken
      const existingSessions = this.sessionManager.getAllSessions()
      const nameTaken = existingSessions.some(s => s.displayName === message.displayName)
      
      if (nameTaken) {
        // Suggest alternative name
        const suffix = crypto.randomBytes(2).toString('hex').toLowerCase()
        const suggestedName = `${message.displayName} #${suffix}`
        this.sendError(ws, 'NAME_TAKEN', 'Display name already taken', { suggestedName })
        return
      }

      // Create session
      const session = this.sessionManager.createSession(ws, message.displayName, message.persistentId, message.avatar, message.sessionId)
      this.socketToSession.set(ws, session.sessionId)
 
       // Generate JWT token
       const token = this.sessionManager.generateToken(session.sessionId)
 
       // Send session created confirmation
       this.sendMessage(ws, {
         type: 'session-created',
         sessionId: session.sessionId,
         persistentId: session.persistentId,
         token,
         displayName: session.displayName,
         avatar: session.avatar,
       })

      console.log(`User "${session.displayName}" joined with session ${session.sessionId}`)

      // Broadcast presence update to all users
      this.broadcastPresenceUpdate()

    } catch (error) {
      console.error('Error handling join message:', error)
      this.sendError(ws, 'JOIN_FAILED', 'Failed to join session')
    }
  }

  private routeMessage(session: SessionData, message: WebSocketMessage): void {
    switch (message.type) {
      case 'connection-request':
        this.handleConnectionRequest(session, message)
        break
      
      case 'connection-response':
        this.handleConnectionResponse(session, message)
        break
      
      case 'chat-message':
        this.handleChatMessage(session, message)
        break
      
      case 'chat-message-edit':
        this.handleChatMessageEdit(session, message)
        break

      case 'chat-message-delete':
        this.handleChatMessageDelete(session, message)
        break
      
      case 'typing-indicator':
        this.handleTypingIndicator(session, message)
        break

      case 'user-status-update':
        this.handleUserStatusUpdate(session, message)
        break
      
      case 'file-transfer-request':
        this.handleFileTransferRequest(session, message)
        break
      
      case 'file-transfer-response':
        this.handleFileTransferResponse(session, message)
        break

      case 'file-transfer-data':
        this.handleFileTransferData(session, message)
        break
      
      case 'webrtc-offer':
      case 'webrtc-answer':
      case 'webrtc-ice-candidate':
      case 'webrtc-call-declined':
      case 'webrtc-call-ended':
      case 'webrtc-file-offer':
      case 'webrtc-file-answer':
      case 'webrtc-file-ice-candidate':
        this.handleWebRTCSignaling(session, message)
        break
      
      default:
        this.sendError(session.socket, 'UNKNOWN_MESSAGE_TYPE', 'Unknown message type')
    }
  }

  private handleConnectionRequest(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) {
      this.sendError(session.socket, 'SESSION_NOT_FOUND', 'Target user not found')
      return
    }

    // Check if already connected
    if (this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) {
      this.sendError(session.socket, 'ALREADY_CONNECTED', 'Already connected to this user')
      return
    }

    // Use the provided ID or generate one
    const requestId = message.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Store the pending request
    const expiresAt = Date.now() + 30000 // 30 seconds
    this.pendingRequests.set(requestId, {
      fromSessionId: session.sessionId,
      toSessionId: message.targetSessionId,
      expiresAt,
    })

    // Send request to target user
    this.sendMessage(targetSession.socket, {
      type: 'incoming-connection-request',
      requestId: requestId,
      fromSessionId: session.sessionId,
      fromPersistentId: session.persistentId,
      fromDisplayName: session.displayName,
      fromAvatar: session.avatar,
      expiresAt,
    })

    // Confirm request sent
    this.sendMessage(session.socket, {
      type: 'request-sent',
      requestId: requestId,
      targetSessionId: message.targetSessionId,
    })

    console.log(`Connection request sent from ${session.displayName} to ${targetSession.displayName}`)
  }

  private handleConnectionResponse(session: SessionData, message: any): void {
    // Find the pending request
    const pendingRequest = this.pendingRequests.get(message.requestId)
    if (!pendingRequest) {
      this.sendError(session.socket, 'REQUEST_NOT_FOUND', 'Connection request not found or expired')
      return
    }

    // Verify this session is the target of the request
    if (pendingRequest.toSessionId !== session.sessionId) {
      this.sendError(session.socket, 'INVALID_REQUEST', 'You are not the target of this request')
      return
    }

    // Get the requester session
    const requesterSession = this.sessionManager.getSession(pendingRequest.fromSessionId)
    if (!requesterSession) {
      this.sendError(session.socket, 'SESSION_NOT_FOUND', 'Requester session not found')
      this.pendingRequests.delete(message.requestId)
      return
    }

    // Remove the pending request
    this.pendingRequests.delete(message.requestId)

    if (message.accepted) {
      // Establish connection
      this.sessionManager.addConnection(session.sessionId, requesterSession.sessionId)
      
      // Notify both users
      this.sendMessage(session.socket, {
        type: 'connection-established',
        sessionId: requesterSession.sessionId,
        persistentId: requesterSession.persistentId,
        displayName: requesterSession.displayName,
        avatar: requesterSession.avatar,
      })
      
      this.sendMessage(requesterSession.socket, {
        type: 'connection-established',
        sessionId: session.sessionId,
        persistentId: session.persistentId,
        displayName: session.displayName,
        avatar: session.avatar,
      })

      console.log(`Connection established between ${session.displayName} and ${requesterSession.displayName}`)
    } else {
      // Notify requester of rejection
      this.sendMessage(requesterSession.socket, {
        type: 'connection-rejected',
        sessionId: session.sessionId,
        displayName: session.displayName,
      })

      console.log(`Connection rejected by ${session.displayName}`)
    }
  }

  private handleChatMessage(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) {
      this.sendError(session.socket, 'SESSION_NOT_FOUND', 'Target user not found')
      return
    }

    // Check if users are connected
    if (!this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) {
      this.sendError(session.socket, 'NOT_CONNECTED', 'Not connected to this user')
      return
    }

    // Forward message to target
    this.sendMessage(targetSession.socket, {
      type: 'chat-message-received',
      messageId: message.id,
      fromSessionId: session.sessionId,
      fromPersistentId: session.persistentId,
      fromDisplayName: session.displayName,
      content: message.content,
      timestamp: message.timestamp,
    })

    // Send delivery confirmation
    this.sendMessage(session.socket, {
      type: 'message-delivered',
      messageId: message.id,
      deliveredAt: Date.now(),
    })
  }

  private handleChatMessageEdit(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) return

    if (!this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) return

    this.sendMessage(targetSession.socket, {
      type: 'chat-message-edited',
      messageId: message.messageId,
      newContent: message.newContent,
    })
    
    // Echo confirmation to sender
    this.sendMessage(session.socket, {
      type: 'chat-message-edited-confirm',
      messageId: message.messageId,
      newContent: message.newContent,
    })
  }

  private handleChatMessageDelete(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) return

    if (!this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) return

    this.sendMessage(targetSession.socket, {
      type: 'chat-message-deleted',
      messageId: message.messageId,
    })
    
    // Echo confirmation to sender
    this.sendMessage(session.socket, {
      type: 'chat-message-deleted-confirm',
      messageId: message.messageId,
    })
  }

  private handleTypingIndicator(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) return

    if (!this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) return

    this.sendMessage(targetSession.socket, {
      type: 'typing-indicator-received',
      fromSessionId: session.sessionId,
      fromDisplayName: session.displayName,
      isTyping: message.isTyping,
    })
  }

  private handleUserStatusUpdate(session: SessionData, message: any): void {
    session.status = message.status
    this.broadcastPresenceUpdate()
  }

  private handleFileTransferRequest(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) {
      this.sendError(session.socket, 'SESSION_NOT_FOUND', 'Target user not found')
      return
    }

    if (!this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) {
      this.sendError(session.socket, 'NOT_CONNECTED', 'Not connected to this user')
      return
    }

    // Send file transfer request to target
    this.sendMessage(targetSession.socket, {
      type: 'incoming-file-transfer-request',
      requestId: message.id,
      fromSessionId: session.sessionId,
      fromDisplayName: session.displayName,
      fileName: message.fileName,
      fileSize: message.fileSize,
      fileType: message.fileType,
      expiresAt: Date.now() + 30000,
    })
  }

  private handleFileTransferResponse(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) return

    if (!this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) return

    this.sendMessage(targetSession.socket, {
      type: 'file-transfer-response',
      requestId: message.requestId,
      accepted: message.accepted,
      fromSessionId: session.sessionId,
    })
  }

  private handleFileTransferData(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) return

    if (!this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) return

    this.sendMessage(targetSession.socket, {
      type: 'file-transfer-data',
      fromSessionId: session.sessionId,
      fileId: message.fileId,
      fileName: message.fileName,
      fileType: message.fileType,
      data: message.data,
      timestamp: Date.now(),
    })
  }

  private handleWebRTCSignaling(session: SessionData, message: any): void {
    const targetSession = this.sessionManager.getSession(message.targetSessionId)
    if (!targetSession) return

    if (!this.sessionManager.isConnected(session.sessionId, message.targetSessionId)) return

    // Relay WebRTC signaling message with sender info
    this.sendMessage(targetSession.socket, {
      ...message,
      sessionId: session.sessionId,
      fromDisplayName: session.displayName,
    })
  }

  private broadcastPresenceUpdate(): void {
    const users = this.sessionManager.getAllSessions()
    const presenceMessage = {
      type: 'presence-update',
      users,
    }

    // Send to all connected sessions
    for (const [ws, sessionId] of this.socketToSession) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendMessage(ws, presenceMessage)
      }
    }
  }

  private sendMessage(ws: WebSocket | null, message: any): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  private sendError(ws: WebSocket | null, code: string, message: string, details?: any): void {
    this.sendMessage(ws, {
      type: 'error',
      code,
      message,
      details,
      timestamp: Date.now(),
    })
  }
}