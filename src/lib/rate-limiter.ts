interface RateLimit {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export class RateLimiter {
  private limits = new Map<string, RateLimit>()
  private configs: Record<string, RateLimitConfig> = {
    'chat-message': { windowMs: 60000, maxRequests: 60 }, // 60 messages per minute
    'connection-request': { windowMs: 60000, maxRequests: 10 }, // 10 requests per minute
    'file-transfer-request': { windowMs: 60000, maxRequests: 5 }, // 5 transfers per minute
    'typing-indicator': { windowMs: 60000, maxRequests: 30 }, // 30 typing updates per minute
    'webrtc-offer': { windowMs: 60000, maxRequests: 20 }, // 20 WebRTC offers per minute
    'webrtc-answer': { windowMs: 60000, maxRequests: 20 }, // 20 WebRTC answers per minute
    'webrtc-ice-candidate': { windowMs: 60000, maxRequests: 100 }, // 100 ICE candidates per minute
  }

  checkLimit(sessionId: string, messageType: string): boolean {
    const config = this.configs[messageType]
    if (!config) {
      // No rate limit configured for this message type
      return true
    }

    const key = `${sessionId}:${messageType}`
    const now = Date.now()
    const limit = this.limits.get(key)

    if (!limit || now > limit.resetTime) {
      // First request or window expired, reset counter
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      })
      return true
    }

    if (limit.count >= config.maxRequests) {
      // Rate limit exceeded
      return false
    }

    // Increment counter
    limit.count++
    return true
  }

  // Clean up expired rate limit entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, limit] of this.limits) {
      if (now > limit.resetTime) {
        this.limits.delete(key)
      }
    }
  }

  // Get current rate limit status for a session
  getStatus(sessionId: string, messageType: string): { remaining: number; resetTime: number } | null {
    const config = this.configs[messageType]
    if (!config) return null

    const key = `${sessionId}:${messageType}`
    const limit = this.limits.get(key)
    const now = Date.now()

    if (!limit || now > limit.resetTime) {
      return {
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      }
    }

    return {
      remaining: Math.max(0, config.maxRequests - limit.count),
      resetTime: limit.resetTime,
    }
  }
}