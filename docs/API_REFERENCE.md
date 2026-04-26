# Hub API Reference

## WebSocket API

### Connection
```
Endpoint: ws://localhost:3000/ws
Protocol: WebSocket
Authentication: JWT token (sent after connection)
```

### Message Format
All WebSocket messages follow this structure:
```typescript
interface BaseMessage {
  id: string           // Unique message ID (nanoid)
  timestamp: number    // Unix timestamp
  sessionId: string    // Sender's session ID
  type: string         // Message type discriminator
}
```

## Client → Server Messages

### 1. Join Session
```typescript
interface JoinMessage {
  type: 'join'
  displayName: string    // 3-50 characters
  avatar?: string        // Optional avatar identifier
}

// Response: session-created or error
```

### 2. Connection Request
```typescript
interface ConnectionRequest {
  type: 'connection-request'
  id: string
  timestamp: number
  sessionId: string
  targetSessionId: string
}

// Response: request-sent confirmation
```

### 3. Connection Response
```typescript
interface ConnectionResponse {
  type: 'connection-response'
  id: string
  timestamp: number
  sessionId: string
  requestId: string      // Original request ID
  accepted: boolean
}

// Response: connection-established or connection-rejected
```

### 4. Chat Message
```typescript
interface ChatMessage {
  type: 'chat-message'
  id: string
  timestamp: number
  sessionId: string
  targetSessionId: string
  content: string        // Max 1000 characters
}

// Response: message-delivered confirmation
```

### 5. Typing Indicator
```typescript
interface TypingIndicator {
  type: 'typing-indicator'
  id: string
  timestamp: number
  sessionId: string
  targetSessionId: string
  isTyping: boolean
}

// No response expected
```

### 6. File Transfer Request
```typescript
interface FileTransferRequest {
  type: 'file-transfer-request'
  id: string
  timestamp: number
  sessionId: string
  targetSessionId: string
  fileName: string
  fileSize: number       // Bytes
  fileType: string       // MIME type
  fileId: string         // Unique file identifier
}

// Response: file-transfer-response from recipient
```

### 7. File Transfer Response
```typescript
interface FileTransferResponse {
  type: 'file-transfer-response'
  id: string
  timestamp: number
  sessionId: string
  requestId: string      // Original request ID
  accepted: boolean
}

// Response: file-transfer-start or file-transfer-rejected
```

### 8. WebRTC Signaling

#### Offer
```typescript
interface WebRTCOffer {
  type: 'webrtc-offer'
  id: string
  timestamp: number
  sessionId: string
  targetSessionId: string
  offer: RTCSessionDescriptionInit
  callType: 'voice' | 'data'
}
```

#### Answer
```typescript
interface WebRTCAnswer {
  type: 'webrtc-answer'
  id: string
  timestamp: number
  sessionId: string
  targetSessionId: string
  answer: RTCSessionDescriptionInit
}
```

#### ICE Candidate
```typescript
interface WebRTCIceCandidate {
  type: 'webrtc-ice-candidate'
  id: string
  timestamp: number
  sessionId: string
  targetSessionId: string
  candidate: RTCIceCandidateInit
}
```

## Server → Client Messages

### 1. Session Created
```typescript
interface SessionCreated {
  type: 'session-created'
  sessionId: string
  token: string          // JWT authentication token
  displayName: string
  avatar?: string
}
```

### 2. Presence Update
```typescript
interface PresenceUpdate {
  type: 'presence-update'
  users: UserSession[]
}

interface UserSession {
  sessionId: string
  displayName: string
  avatar?: string
  status: 'online' | 'away' | 'in-call'
  joinedAt: number
}
```

### 3. Connection Established
```typescript
interface ConnectionEstablished {
  type: 'connection-established'
  sessionId: string      // The user you're now connected to
  displayName: string
  avatar?: string
}
```

### 4. Incoming Connection Request
```typescript
interface IncomingConnectionRequest {
  type: 'incoming-connection-request'
  requestId: string
  fromSessionId: string
  fromDisplayName: string
  fromAvatar?: string
  expiresAt: number      // Unix timestamp (30s from now)
}
```

### 5. Chat Message Received
```typescript
interface ChatMessageReceived {
  type: 'chat-message-received'
  messageId: string
  fromSessionId: string
  fromDisplayName: string
  content: string
  timestamp: number
}
```

### 6. Message Delivered
```typescript
interface MessageDelivered {
  type: 'message-delivered'
  messageId: string      // Original message ID
  deliveredAt: number
}
```

### 7. Typing Indicator Received
```typescript
interface TypingIndicatorReceived {
  type: 'typing-indicator-received'
  fromSessionId: string
  fromDisplayName: string
  isTyping: boolean
}
```

### 8. File Transfer Events

#### Incoming Request
```typescript
interface IncomingFileTransferRequest {
  type: 'incoming-file-transfer-request'
  requestId: string
  fromSessionId: string
  fromDisplayName: string
  fileName: string
  fileSize: number
  fileType: string
  expiresAt: number
}
```

#### Transfer Start
```typescript
interface FileTransferStart {
  type: 'file-transfer-start'
  transferId: string
  fileName: string
  fileSize: number
  method: 'websocket' | 'webrtc'  // Transfer method
}
```

#### Transfer Progress
```typescript
interface FileTransferProgress {
  type: 'file-transfer-progress'
  transferId: string
  bytesTransferred: number
  totalBytes: number
  percentage: number
}
```

#### Transfer Complete
```typescript
interface FileTransferComplete {
  type: 'file-transfer-complete'
  transferId: string
  fileName: string
  downloadUrl?: string   // For WebSocket transfers
}
```

### 9. WebRTC Signaling (Relayed)
All WebRTC messages are relayed as-is to the target session.

### 10. Error Messages
```typescript
interface ErrorMessage {
  type: 'error'
  code: string
  message: string
  details?: any
  timestamp: number
}

// Error codes:
// INVALID_MESSAGE - Malformed message
// RATE_LIMIT_EXCEEDED - Too many messages
// SESSION_NOT_FOUND - Target session doesn't exist
// NOT_CONNECTED - Users not connected
// FILE_TOO_LARGE - File exceeds size limit
// INVALID_FILE_TYPE - Unsupported file type
// TRANSFER_FAILED - File transfer error
// WEBRTC_ERROR - WebRTC connection error
```

## HTTP API

### Health Check
```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "activeUsers": 15,
  "uptime": 3600,
  "memoryUsage": 45.2,
  "version": "1.0.0"
}
```

### Statistics (Admin)
```http
GET /api/admin/stats
Authorization: Bearer <admin-token>
```

Response:
```json
{
  "activeUsers": 15,
  "totalConnections": 45,
  "messagesPerMinute": 120,
  "activeFileTransfers": 3,
  "memoryUsage": {
    "used": 67108864,
    "total": 134217728,
    "percentage": 50.0
  },
  "uptime": 7200
}
```

### Kick User (Admin)
```http
POST /api/admin/kick
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "sessionId": "abc12345",
  "reason": "Violation of terms"
}
```

Response:
```json
{
  "success": true,
  "message": "User kicked successfully"
}
```

## Rate Limits

### Per Session Limits
```typescript
const rateLimits = {
  messages: 60,              // per minute
  connectionRequests: 10,    // per minute
  fileTransfers: 5,          // per minute
  webrtcSignaling: 100,      // per minute
  typing: 30                 // per minute
}
```

### Global Limits
```typescript
const globalLimits = {
  maxUsers: 100,
  maxFileSize: 104857600,    // 100MB
  maxMessageLength: 1000,
  sessionTimeout: 300000     // 5 minutes
}
```

## Authentication

### JWT Token Structure
```typescript
interface JWTPayload {
  sessionId: string
  iat: number        // Issued at
  exp: number        // Expires at (24 hours)
}
```

### Token Usage
- Include in WebSocket messages as `sessionId` field
- Server validates token on each message
- Invalid tokens result in connection termination

## File Transfer Protocol

### Small Files (< 1MB)
1. Send `file-transfer-request`
2. Wait for `file-transfer-response` (accepted)
3. Server sends `file-transfer-start` with WebSocket method
4. Send file data in chunks via WebSocket
5. Server relays chunks to recipient
6. Server sends `file-transfer-complete` to both parties

### Large Files (≥ 1MB)
1. Send `file-transfer-request`
2. Wait for `file-transfer-response` (accepted)
3. Server sends `file-transfer-start` with WebRTC method
4. Establish WebRTC data channel via signaling
5. Send file chunks directly peer-to-peer
6. Send progress updates via WebSocket
7. Send completion notification via WebSocket

### File Chunk Format (WebRTC)
```typescript
interface FileChunk {
  chunkId: number
  totalChunks: number
  data: ArrayBuffer
  checksum: string       // SHA-256 hash
}
```

## WebRTC Configuration

### ICE Servers
```typescript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Optional TURN server
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'username',
    credential: 'password'
  }
]
```

### Data Channel Configuration
```typescript
const dataChannelConfig = {
  ordered: true,           // Ensure ordered delivery
  maxRetransmits: 3,      // Retry failed packets
  label: 'file-transfer'   // Channel identifier
}
```

## Error Handling

### Connection Errors
- **1000**: Normal closure
- **1001**: Going away (page refresh)
- **1006**: Abnormal closure (network issue)
- **4000**: Authentication failed
- **4001**: Rate limit exceeded
- **4002**: Server full

### Message Validation
All incoming messages are validated against Zod schemas. Invalid messages result in:
```typescript
{
  type: 'error',
  code: 'INVALID_MESSAGE',
  message: 'Message validation failed',
  details: {
    field: 'displayName',
    error: 'String must contain at least 3 character(s)'
  }
}
```

### Retry Logic
Clients should implement exponential backoff for:
- WebSocket reconnection
- File transfer chunks
- WebRTC connection attempts

```typescript
const retryDelays = [1000, 2000, 4000, 8000, 16000] // milliseconds
```