import { SessionManager } from '../session-manager'
import { WebSocket } from 'ws'

describe('SessionManager', () => {
  let sessionManager: SessionManager
  let mockSocket: any

  beforeEach(() => {
    sessionManager = new SessionManager()
    mockSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1,
    }
  })

  describe('createSession', () => {
    it('should create a new session with valid display name', () => {
      const session = sessionManager.createSession(mockSocket, 'TestUser')

      expect(session).toBeDefined()
      expect(session.displayName).toBe('TestUser')
      expect(session.sessionId).toBeDefined()
      expect(session.status).toBe('online')
      expect(session.connections.size).toBe(0)
    })

    it('should create session with avatar', () => {
      const session = sessionManager.createSession(mockSocket, 'TestUser', 'blue-smile')

      expect(session.avatar).toBe('blue-smile')
    })

    it('should generate unique session IDs', () => {
      const session1 = sessionManager.createSession(mockSocket, 'User1')
      const session2 = sessionManager.createSession(mockSocket, 'User2')

      expect(session1.sessionId).not.toBe(session2.sessionId)
    })
  })

  describe('getSession', () => {
    it('should retrieve existing session', () => {
      const created = sessionManager.createSession(mockSocket, 'TestUser')
      const retrieved = sessionManager.getSession(created.sessionId)

      expect(retrieved).toBeDefined()
      expect(retrieved?.sessionId).toBe(created.sessionId)
      expect(retrieved?.displayName).toBe('TestUser')
    })

    it('should return undefined for non-existent session', () => {
      const session = sessionManager.getSession('non-existent-id')

      expect(session).toBeUndefined()
    })
  })

  describe('removeSession', () => {
    it('should remove session and clean up connections', () => {
      const session1 = sessionManager.createSession(mockSocket, 'User1')
      const session2 = sessionManager.createSession(mockSocket, 'User2')

      sessionManager.addConnection(session1.sessionId, session2.sessionId)
      sessionManager.removeSession(session1.sessionId)

      const retrieved = sessionManager.getSession(session1.sessionId)
      expect(retrieved).toBeUndefined()

      // Check that session2's connections were cleaned up
      const session2Updated = sessionManager.getSession(session2.sessionId)
      expect(session2Updated?.connections.has(session1.sessionId)).toBe(false)
    })
  })

  describe('getAllSessions', () => {
    it('should return all active sessions', () => {
      sessionManager.createSession(mockSocket, 'User1')
      sessionManager.createSession(mockSocket, 'User2')
      sessionManager.createSession(mockSocket, 'User3')

      const sessions = sessionManager.getAllSessions()

      expect(sessions).toHaveLength(3)
      expect(sessions.map(s => s.displayName)).toContain('User1')
      expect(sessions.map(s => s.displayName)).toContain('User2')
      expect(sessions.map(s => s.displayName)).toContain('User3')
    })

    it('should return empty array when no sessions exist', () => {
      const sessions = sessionManager.getAllSessions()

      expect(sessions).toHaveLength(0)
    })
  })

  describe('addConnection', () => {
    it('should establish bidirectional connection between users', () => {
      const session1 = sessionManager.createSession(mockSocket, 'User1')
      const session2 = sessionManager.createSession(mockSocket, 'User2')

      sessionManager.addConnection(session1.sessionId, session2.sessionId)

      expect(session1.connections.has(session2.sessionId)).toBe(true)
      expect(session2.connections.has(session1.sessionId)).toBe(true)
    })

    it('should handle non-existent sessions gracefully', () => {
      const session1 = sessionManager.createSession(mockSocket, 'User1')

      expect(() => {
        sessionManager.addConnection(session1.sessionId, 'non-existent')
      }).not.toThrow()
    })
  })

  describe('isConnected', () => {
    it('should return true for connected users', () => {
      const session1 = sessionManager.createSession(mockSocket, 'User1')
      const session2 = sessionManager.createSession(mockSocket, 'User2')

      sessionManager.addConnection(session1.sessionId, session2.sessionId)

      expect(sessionManager.isConnected(session1.sessionId, session2.sessionId)).toBe(true)
      expect(sessionManager.isConnected(session2.sessionId, session1.sessionId)).toBe(true)
    })

    it('should return false for non-connected users', () => {
      const session1 = sessionManager.createSession(mockSocket, 'User1')
      const session2 = sessionManager.createSession(mockSocket, 'User2')

      expect(sessionManager.isConnected(session1.sessionId, session2.sessionId)).toBe(false)
    })
  })

  describe('JWT token management', () => {
    it('should generate valid JWT token', () => {
      const session = sessionManager.createSession(mockSocket, 'TestUser')
      const token = sessionManager.generateToken(session.sessionId)

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should verify valid token', () => {
      const session = sessionManager.createSession(mockSocket, 'TestUser')
      const token = sessionManager.generateToken(session.sessionId)
      const verified = sessionManager.verifyToken(token)

      expect(verified).toBe(session.sessionId)
    })

    it('should reject invalid token', () => {
      const verified = sessionManager.verifyToken('invalid-token')

      expect(verified).toBeNull()
    })
  })

  describe('cleanupInactiveSessions', () => {
    it('should remove sessions that exceed timeout', () => {
      const session = sessionManager.createSession(mockSocket, 'TestUser')
      
      // Manually set last activity to past
      const sessionData = sessionManager.getSession(session.sessionId)
      if (sessionData) {
        sessionData.lastActivity = Date.now() - 10 * 60 * 1000 // 10 minutes ago
      }

      sessionManager.cleanupInactiveSessions(5 * 60 * 1000) // 5 minute timeout

      const retrieved = sessionManager.getSession(session.sessionId)
      expect(retrieved).toBeUndefined()
    })

    it('should keep active sessions', () => {
      const session = sessionManager.createSession(mockSocket, 'TestUser')
      
      sessionManager.cleanupInactiveSessions(5 * 60 * 1000)

      const retrieved = sessionManager.getSession(session.sessionId)
      expect(retrieved).toBeDefined()
    })
  })
})