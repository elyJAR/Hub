# WebRTC Voice Calls Implementation Guide

This document explains the WebRTC voice call implementation in Hub.

## Architecture Overview

```
┌─────────────┐                    ┌─────────────┐
│   User A    │                    │   User B    │
│             │                    │             │
│  Browser    │                    │  Browser    │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │  1. WebSocket Signaling          │
       │◄────────────────────────────────►│
       │                                  │
       │  2. WebRTC Peer Connection       │
       │◄═════════════════════════════════►│
       │     (Direct P2P Audio)           │
       │                                  │
```

## Call Flow

### 1. Initiating a Call

```typescript
// User A clicks call button
startCall(targetUserId)

// Steps:
// 1. Request microphone permission
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

// 2. Create RTCPeerConnection
const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

// 3. Add local audio track
stream.getTracks().forEach(track => pc.addTrack(track, stream))

// 4. Create and send offer
const offer = await pc.createOffer()
await pc.setLocalDescription(offer)
sendMessage({ type: 'webrtc-offer', targetSessionId, offer })
```

### 2. Receiving a Call

```typescript
// User B receives offer via WebSocket
addEventListener('webrtc-signaling', async (message) => {
  if (message.type === 'webrtc-offer') {
    // Show incoming call UI
    setState({ isCallIncoming: true, remoteUserId: message.sessionId })
    
    // Initialize peer connection
    const pc = initializePeerConnection(message.sessionId)
    
    // Set remote description
    await pc.setRemoteDescription(new RTCSessionDescription(message.offer))
  }
})
```

### 3. Accepting a Call

```typescript
// User B clicks accept
acceptCall()

// Steps:
// 1. Request microphone permission
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

// 2. Add local audio track
stream.getTracks().forEach(track => pc.addTrack(track, stream))

// 3. Create and send answer
const answer = await pc.createAnswer()
await pc.setLocalDescription(answer)
sendMessage({ type: 'webrtc-answer', targetSessionId, answer })
```

### 4. ICE Candidate Exchange

```typescript
// Both peers exchange ICE candidates
pc.onicecandidate = (event) => {
  if (event.candidate) {
    sendMessage({
      type: 'webrtc-ice-candidate',
      targetSessionId,
      candidate: event.candidate.toJSON()
    })
  }
}

// Receive and add ICE candidates
addEventListener('webrtc-signaling', async (message) => {
  if (message.type === 'webrtc-ice-candidate') {
    await pc.addIceCandidate(new RTCIceCandidate(message.candidate))
  }
})
```

### 5. Audio Streaming

```typescript
// Receive remote audio track
pc.ontrack = (event) => {
  const remoteStream = event.streams[0]
  
  // Play remote audio
  const audioElement = document.getElementById('remote-audio')
  audioElement.srcObject = remoteStream
  audioElement.play()
}
```

### 6. Ending a Call

```typescript
// Either user clicks end call
endCall()

// Steps:
// 1. Stop all local tracks
localStream.getTracks().forEach(track => track.stop())

// 2. Close peer connection
peerConnection.close()

// 3. Notify other user
sendMessage({ type: 'webrtc-call-ended', targetSessionId })

// 4. Cleanup state
cleanup()
```

## Components

### useWebRTC Hook
Location: `src/hooks/use-webrtc.ts`

Manages WebRTC state and operations:
- Peer connection lifecycle
- Media stream management
- Signaling message handling
- Call state management

```typescript
const {
  isInCall,
  isCallIncoming,
  isMuted,
  callDuration,
  remoteUserId,
  remoteUserName,
  startCall,
  acceptCall,
  declineCall,
  endCall,
  toggleMute,
} = useWebRTC()
```

### CallInterface Component
Location: `src/components/call-interface.tsx`

UI for incoming and active calls:
- Incoming call modal with accept/decline
- Active call UI with mute and end call controls
- Call duration display
- Audio visualizer

## ICE Servers Configuration

### STUN Servers
Used for NAT traversal:

```typescript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]
```

### TURN Servers (Optional)
For networks with strict firewalls:

```typescript
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'username',
    credential: 'password'
  }
]
```

## Error Handling

### Connection Failures

```typescript
pc.onconnectionstatechange = () => {
  if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
    setState({ callError: 'Connection lost' })
    cleanup()
  }
}

pc.oniceconnectionstatechange = () => {
  if (pc.iceConnectionState === 'failed') {
    setState({ callError: 'Failed to establish connection' })
    cleanup()
  }
}
```

### Microphone Permission Denied

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
} catch (error) {
  if (error.name === 'NotAllowedError') {
    setState({ callError: 'Microphone permission denied' })
  } else if (error.name === 'NotFoundError') {
    setState({ callError: 'No microphone found' })
  }
}
```

## Testing

### Manual Testing
1. Open two browser windows
2. Join with different users
3. Connect users
4. Start a call from one user
5. Accept call from other user
6. Test mute/unmute
7. Test end call

### Automated Testing
```typescript
// tests/e2e/voice-calls.spec.ts
test('should establish voice call between two users', async ({ browser }) => {
  const context1 = await browser.newContext({ permissions: ['microphone'] })
  const context2 = await browser.newContext({ permissions: ['microphone'] })
  
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()
  
  // Join and connect users
  // ...
  
  // Start call
  await page1.getByRole('button', { name: /call/i }).click()
  
  // Accept call
  await page2.getByRole('button', { name: /accept/i }).click()
  
  // Verify call is active
  await expect(page1.getByText(/in call/i)).toBeVisible()
  await expect(page2.getByText(/in call/i)).toBeVisible()
})
```

## Troubleshooting

### No Audio
1. Check microphone permissions
2. Verify ICE candidates are being exchanged
3. Check browser console for errors
4. Test with different browsers

### Connection Fails
1. Check ICE server configuration
2. Verify WebSocket connection is active
3. Test on different networks
4. Consider adding TURN server

### Poor Audio Quality
1. Check network bandwidth
2. Adjust audio constraints:
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
})
```

## Future Enhancements

### Video Calls
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  }
})
```

### Screen Sharing
```typescript
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: true,
  audio: false
})
```

### Group Calls
Implement SFU (Selective Forwarding Unit) architecture:
- Each peer sends one stream to SFU
- SFU forwards streams to all other peers
- Reduces bandwidth requirements

### Call Recording
```typescript
const mediaRecorder = new MediaRecorder(stream)
const chunks = []

mediaRecorder.ondataavailable = (event) => {
  chunks.push(event.data)
}

mediaRecorder.onstop = () => {
  const blob = new Blob(chunks, { type: 'audio/webm' })
  const url = URL.createObjectURL(blob)
  // Save or download recording
}

mediaRecorder.start()
```

## Resources

- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebRTC Samples](https://webrtc.github.io/samples/)
- [Perfect Negotiation Pattern](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)
- [STUN/TURN Servers](https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b)
