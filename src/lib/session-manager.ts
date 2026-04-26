import { WebSocket } from 'ws'
import { nanoid } from 'nanoid'
import jwt from 'jsonwebtoken'
import { UserSession } from '@/types/messages'

export interface SessionData extends UserSession {
  socket: WebSocket
  connections: Set<string> // Connected session IDs
  lastActivity: number
}

export class SessionManager {
  private sessions = new Map<string, SessionData>()
  private jwtSecret: string
  
  constructor() {
    // Generate a random secret on startup - invalidates all sessions on restart
    this.jwtSecret = nanoid(32)
  }

  createSession(socket: WebSocket, displayName: string, avatar?: string): SessionData {
    const sessionId = nanoid(8)
    const now = Date.now()
    
    const session: SessionData = {
      sessionId,
      displayName,
      avatar,
      status: 'online',
      joinedAt: now,
      socket,
      connections: new Set(),
      lastActivity: now,
    }

    this.sessions.set(sessionId, session)
    return session
  }

  getSession(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId)
  }

  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      // Notify connected users that this session is gone
      session.connections.forEach(connectedId => {
        const connectedSession = this.sessions.get(connectedId)
        if (connectedSession) {
          connectedSession.connections.delete(sessionId)
        }
      })
      this.sessions.delete(sessionId)
    }
  }

  getAllSessions(): UserSession[] {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      displayName: session.displayName,
      avatar: session.avatar,
      status: session.status,
      joinedAt: session.joinedAt,
    }))
  }

  updateLastActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivity = Date.now()
    }
  }

  addConnection(sessionId1: string, sessionId2: string): void {
    const session1 = this.sessions.get(sessionId1)
    const session2 = this.sessions.get(sessionId2)
    
    if (session1 && session2) {
      session1.connections.add(sessionId2)
      session2.connections.add(sessionId1)
    }
  }

  removeConnection(sessionId1: string, sessionId2: string): void {
    const session1 = this.sessions.get(sessionId1)
    const session2 = this.sessions.get(sessionId2)
    
    if (session1) session1.connections.delete(sessionId2)
    if (session2) session2.connections.delete(sessionId1)
  }

  isConnected(sessionId1: string, sessionId2: string): boolean {
    const session1 = this.sessions.get(sessionId1)
    return session1?.connections.has(sessionId2) ?? false
  }

  generateToken(sessionId: string): string {
    return jwt.sign({ sessionId }, this.jwtSecret, { expiresIn: '24h' })
  }

  verifyToken(token: string): string | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { sessionId: string }
      return decoded.sessionId
    } catch {
      return null
    }
  }

  // Cleanup inactive sessions (call periodically)
  cleanupInactiveSessions(timeoutMs: number = 5 * 60 * 1000): void {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > timeoutMs) {
        toRemove.push(sessionId)
      }
    }

    toRemove.forEach(sessionId => this.removeSession(sessionId))
  }
}