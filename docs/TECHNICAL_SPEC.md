# Hub Technical Specification

## Architecture Overview

### System Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Browser A     │    │   Next.js Server │    │   Browser B     │
│                 │    │                  │    │                 │
│  React Client   │◄──►│  WebSocket Hub   │◄──►│  React Client   │
│  WebRTC Peer    │    │  Session Manager │    │  WebRTC Peer    │
│                 │    │  Message Router  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │  File System │
                       │  (Temp only) │
                       └──────────────┘
```

### Technology Stack
- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript
- **Backend**: Custom Next.js server + Express + WebSocket (ws)
- **Styling**: Tailwind CSS
- **Validation**: Zod schemas
- **Authentication**: JWT (session-based)
- **Real-time**: WebSocket + WebRTC
- **Build**: TypeScript + ESLint + Prettier

## Data Models

### Session Data Structure
```typescript
interface SessionData {
  sessionId: string        // Unique 8-character ID
  displayName: string      // User-chosen name
  avatar?: string          // Color/emoji combination
  status: 'online' | 'away' | 'in-call'
  joinedAt: number         // Unix timestamp
  socket: WebSocket        // Active connection
  connections: Set<string> // Connected session IDs
  lastActivity: number     // Unix timestamp
}
```

### Message Schema Hierarchy
```typescript
// Base message (all messages extend this)
BaseMessage {
  id: string           // nanoid(8)
  timestamp: number    // Unix timestamp
  sessionId: string    // Sender's session ID
}

// Specific message types
ConnectionRequest extends BaseMessage {
  type: 'connection-request'
  targetSessionId: string
}

ChatMessage extends BaseMessage {
  type: 'chat-message'
  targetSessionId: string
  content: string      // Max 1000 characters
}

FileTransferRequest extends BaseMessage {
  type: 'file-transfer-request'
  targetSessionId: string
  fileName: string
  fileSize: number     // Bytes
  fileType: string     // MIME type
}
```

## WebSocket Protocol

### Connection Lifecycle
1. **Handshake**: Client connects to `/ws` endpoint
2. **Authentication**: Server generates JWT token
3. **Session Creation**: Server creates session record
4. **Presence Broadcast**: Server notifies all clients of new user
5. **Message Routing**: Server routes messages between sessions
6. **Cleanup**: Server removes session on disconnect

### Message Routing Rules
- **Direct Messages**: Route only to target session
- **Broadcast Messages**: Send to all connected sessions
- **Connection Requests**: Route to target + confirmation to sender
- **WebRTC Signaling**: Route between specific peer sessions

### Rate Limiting
```typescript
const rateLimits = {
  messages: 60,        // per minute
  connectionRequests: 10, // per minute
  fileTransfers: 5,    // per minute
  webrtcSignaling: 100 // per minute
}
```

## WebRTC Implementation

### Signaling Flow
1. **Offer Creation**: Caller creates RTCPeerConnection + offer
2. **Offer Transmission**: Sent via WebSocket to callee
3. **Answer Generation**: Callee creates answer
4. **Answer Transmission**: Sent back via WebSocket
5. **ICE Exchange**: Candidates exchanged until connection established

### Connection Types
- **Voice Calls**: Audio-only RTCPeerConnection
- **File Transfer**: RTCDataChannel with chunking
- **Future Video**: Video + audio RTCPeerConnection

### Fallback Strategy
```typescript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' }, // Public STUN
  // Local TURN server (optional)
  { 
    urls: 'turn:192.168.1.42:3478',
    username: 'hub',
    credential: 'generated-password'
  }
]
```

## File Transfer Protocol

### Small Files (< 1MB)
- Transfer via WebSocket messages
- Base64 encoding for binary data
- Single message transmission
- Server acts as relay

### Large Files (≥ 1MB)
- Use WebRTC data channels
- Chunk into 16KB pieces
- Sequential transmission with ACK
- Progress tracking per chunk
- Resume capability on failure

### File Chunking Algorithm
```typescript
interface FileChunk {
  chunkId: number      // Sequential chunk number
  totalChunks: number  // Total number of chunks
  data: ArrayBuffer    // Chunk data (max 16KB)
  checksum: string     // SHA-256 hash for integrity
}
```

## Security Model

### Session Security
- **JWT Tokens**: Signed with server-generated secret
- **Token Rotation**: New secret on server restart
- **Session Timeout**: 5-minute inactivity cleanup
- **Rate Limiting**: Per-session message limits

### Transport Security
- **WebSocket**: WSS in production (TLS encryption)
- **WebRTC**: Built-in DTLS encryption
- **File Transfer**: Encrypted via WebRTC data channels

### Permission Model
- **Explicit Consent**: All actions require recipient approval
- **Connection Requests**: Must be accepted before communication
- **File Transfers**: Recipient sees file details before accepting
- **Voice Calls**: Microphone permission + call acceptance required

## Performance Requirements

### Latency Targets
- **Message Delivery**: < 100ms on LAN
- **Connection Setup**: < 2 seconds
- **File Transfer Start**: < 1 second after acceptance
- **Voice Call Setup**: < 3 seconds

### Scalability Limits
- **Concurrent Users**: 50+ (tested target)
- **Message Rate**: 1000 messages/minute server-wide
- **File Transfer**: 10 concurrent transfers
- **Memory Usage**: < 100MB server RAM

### Browser Compatibility
- **Chrome**: 90+ (full WebRTC support)
- **Safari**: 14+ (WebRTC + data channels)
- **Firefox**: 88+ (full feature support)
- **Edge**: 90+ (Chromium-based)

## Database & Storage

### In-Memory Storage
```typescript
class ServerState {
  sessions: Map<string, SessionData>
  messageHistory: Map<string, ChatMessage[]> // 10-minute TTL
  activeTransfers: Map<string, FileTransfer>
  connectionRequests: Map<string, PendingRequest> // 30-second TTL
}
```

### No Persistent Storage
- All data lives in server memory
- Server restart clears all state
- No user accounts or message history
- Temporary file storage only during transfers

## API Endpoints

### HTTP Endpoints
```
GET  /                    # Serve Next.js application
GET  /api/health         # Server health check
GET  /api/stats          # Connection statistics (admin)
POST /api/admin/kick     # Kick user (admin)
```

### WebSocket Endpoint
```
WS   /ws                 # Main WebSocket connection
```

### Message Types (WebSocket)
```
// Client → Server
connection-request       # Request to connect to another user
connection-response      # Accept/reject connection request
chat-message            # Send text message
typing-indicator        # Typing status update
file-transfer-request   # Request to send file
file-transfer-response  # Accept/reject file transfer
webrtc-offer           # WebRTC offer for voice/data
webrtc-answer          # WebRTC answer
webrtc-ice-candidate   # ICE candidate exchange

// Server → Client
presence-update         # User list changes
connection-established  # Connection confirmed
message-delivered       # Message delivery confirmation
error                  # Error notifications
```

## Error Handling

### Client-Side Errors
- **Network Disconnection**: Auto-reconnect with exponential backoff
- **WebRTC Failure**: Fallback to server relay
- **Permission Denied**: Clear user instructions
- **File Transfer Failure**: Resume capability

### Server-Side Errors
- **Invalid Messages**: Log + ignore (don't crash)
- **Rate Limit Exceeded**: Temporary connection throttling
- **Memory Pressure**: Aggressive session cleanup
- **WebSocket Errors**: Graceful session removal

### Error Response Format
```typescript
interface ErrorMessage {
  type: 'error'
  code: string           // ERROR_CODE_CONSTANT
  message: string        // Human-readable description
  details?: any          // Additional context
  timestamp: number
}
```

## Deployment Configuration

### Environment Variables
```bash
NODE_ENV=production
PORT=3000
WS_PORT=3001              # Optional separate WebSocket port
JWT_SECRET=auto-generated # Override auto-generation
MAX_USERS=100            # Connection limit
ADMIN_PASSWORD=secret    # Admin dashboard access
```

### Docker Configuration
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Resource Requirements
- **CPU**: 1 core minimum, 2+ recommended
- **RAM**: 512MB minimum, 1GB+ recommended
- **Network**: 100Mbps+ for 50 concurrent users
- **Storage**: 1GB for application + temporary files

## Monitoring & Logging

### Metrics to Track
- Active session count
- Message throughput (messages/second)
- WebRTC connection success rate
- File transfer completion rate
- Average connection setup time
- Memory usage trends

### Log Levels
- **ERROR**: Connection failures, invalid messages
- **WARN**: Rate limit hits, permission denials
- **INFO**: User joins/leaves, connections established
- **DEBUG**: Message routing, WebRTC signaling

### Health Checks
```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  activeUsers: number
  memoryUsage: number
  uptime: number
  lastError?: string
}
```