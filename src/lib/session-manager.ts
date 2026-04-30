import { WebSocket } from 'ws'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { UserSession } from '@/types/messages'
import fs from 'fs'
import path from 'path'

export interface SessionData extends UserSession {
  socket: WebSocket | null
  connections: Set<string> // Connected session IDs
  lastActivity: number
}

const DATA_DIR = path.join(process.cwd(), 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')

export class SessionManager {
  private sessions = new Map<string, SessionData>()
  private jwtSecret: string
  
  constructor() {
    // Generate a random secret on startup - invalidates all sessions on restart
    this.jwtSecret = crypto.randomBytes(16).toString('hex')

    // Load from disk if exists
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true })
      }
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = fs.readFileSync(SESSIONS_FILE, 'utf-8')
        const saved = JSON.parse(data)
        for (const [id, s] of Object.entries(saved) as any) {
          this.sessions.set(id, {
            ...s,
            status: 'offline',
            socket: null, // sockets can't be saved
            connections: new Set(s.connections),
          })
        }
        console.log(`Loaded ${this.sessions.size} sessions from disk.`)
      }
    } catch (e) {
      console.error('Failed to load sessions from disk:', e)
    }
  }

  private saveToDisk() {
    try {
      const toSave: any = {}
      for (const [id, s] of this.sessions) {
        toSave[id] = {
          sessionId: s.sessionId,
          persistentId: s.persistentId,
          displayName: s.displayName,
          avatar: s.avatar,
          status: s.status,
          joinedAt: s.joinedAt,
          lastActivity: s.lastActivity,
          connections: Array.from(s.connections)
        }
      }
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(toSave, null, 2))
    } catch (e) {
      console.error('Failed to save sessions:', e)
    }
  }

  createSession(socket: WebSocket, displayName: string, persistentId: string, avatar?: string, requestedSessionId?: string): SessionData {
    const sessionId = requestedSessionId && this.sessions.has(requestedSessionId) 
        ? requestedSessionId 
        : (requestedSessionId || crypto.randomBytes(4).toString('hex'))
    const now = Date.now()
    
    let session = this.sessions.get(sessionId)
    if (session) {
        // Reconnecting
        session.socket = socket
        session.displayName = displayName
        session.persistentId = persistentId
        session.avatar = avatar
        session.status = 'online'
        session.lastActivity = now
    } else {
        session = {
          sessionId,
          persistentId,
          displayName,
          avatar,
          status: 'online',
          joinedAt: now,
          socket,
          connections: new Set(),
          lastActivity: now,
        }
        this.sessions.set(sessionId, session)
    }

    this.saveToDisk()
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
      this.saveToDisk()
    }
  }

  getAllSessions(): UserSession[] {
    return Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      persistentId: session.persistentId,
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
      this.saveToDisk()
    }
  }

  removeConnection(sessionId1: string, sessionId2: string): void {
    const session1 = this.sessions.get(sessionId1)
    const session2 = this.sessions.get(sessionId2)
    
    if (session1) session1.connections.delete(sessionId2)
    if (session2) session2.connections.delete(sessionId1)
    this.saveToDisk()
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