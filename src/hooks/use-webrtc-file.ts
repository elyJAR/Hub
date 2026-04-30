import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocketContext } from '@/contexts/websocket-context'

const CHUNK_SIZE = 64 * 1024 // 64 KB
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

export interface FileTransferProgress {
  fileId: string
  progress: number // 0 to 100
  status: 'pending' | 'transferring' | 'completed' | 'error'
  dataUrl?: string
  error?: string
}

export function useWebRTCFileTransfer() {
  const { addEventListener, sendMessage } = useWebSocketContext()
  const [transfers, setTransfers] = useState<Record<string, FileTransferProgress>>({})
  
  // Store peer connections and data channels per fileId
  const peersRef = useRef<Record<string, RTCPeerConnection>>({})
  const channelsRef = useRef<Record<string, RTCDataChannel>>({})
  const receiveBuffersRef = useRef<Record<string, ArrayBuffer[]>>({})
  const receivedBytesRef = useRef<Record<string, number>>({})
  const expectedSizesRef = useRef<Record<string, number>>({})
  const fileMetaRef = useRef<Record<string, { type: string, name: string }>>({})

  const updateProgress = useCallback((fileId: string, updates: Partial<FileTransferProgress>) => {
    setTransfers(prev => ({
      ...prev,
      [fileId]: {
        ...prev[fileId],
        ...updates,
      }
    }))
  }, [])

  const cleanupTransfer = useCallback((fileId: string) => {
    if (channelsRef.current[fileId]) {
      channelsRef.current[fileId].close()
      delete channelsRef.current[fileId]
    }
    if (peersRef.current[fileId]) {
      peersRef.current[fileId].close()
      delete peersRef.current[fileId]
    }
    delete receiveBuffersRef.current[fileId]
    delete receivedBytesRef.current[fileId]
    delete expectedSizesRef.current[fileId]
    delete fileMetaRef.current[fileId]
  }, [])

  const createPeerConnection = useCallback((targetUserId: string, fileId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peersRef.current[fileId] = pc

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          type: 'webrtc-file-ice-candidate',
          targetSessionId: targetUserId,
          fileId,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        updateProgress(fileId, { status: 'error', error: 'Connection lost' })
        cleanupTransfer(fileId)
      }
    }

    return pc
  }, [sendMessage, updateProgress, cleanupTransfer])

  const sendFileChunks = useCallback((fileId: string, file: File, channel: RTCDataChannel) => {
    let offset = 0
    const reader = new FileReader()
    updateProgress(fileId, { status: 'transferring', progress: 0 })

    const readNextChunk = () => {
      const slice = file.slice(offset, offset + CHUNK_SIZE)
      reader.readAsArrayBuffer(slice)
    }

    reader.onload = (e) => {
      if (!e.target?.result || channel.readyState !== 'open') return
      
      const buffer = e.target.result as ArrayBuffer
      
      // Handle backpressure
      if (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
        channel.onbufferedamountlow = () => {
          channel.onbufferedamountlow = null
          channel.send(buffer)
          offset += buffer.byteLength
          updateProgress(fileId, { progress: Math.min(99, Math.round((offset / file.size) * 100)) })
          
          if (offset < file.size) {
            readNextChunk()
          } else {
            // Done sending
            channel.send(JSON.stringify({ type: 'EOF' }))
            updateProgress(fileId, { status: 'completed', progress: 100 })
          }
        }
      } else {
        channel.send(buffer)
        offset += buffer.byteLength
        updateProgress(fileId, { progress: Math.min(99, Math.round((offset / file.size) * 100)) })
        
        if (offset < file.size) {
          readNextChunk()
        } else {
          // Done sending
          channel.send(JSON.stringify({ type: 'EOF' }))
          updateProgress(fileId, { status: 'completed', progress: 100 })
        }
      }
    }

    channel.bufferedAmountLowThreshold = CHUNK_SIZE * 4
    readNextChunk()
  }, [updateProgress])

  // Called by sender after receiver accepts the file transfer request
  const startWebRTCFileTransfer = useCallback(async (targetUserId: string, fileId: string, file: File) => {
    try {
      const pc = createPeerConnection(targetUserId, fileId)
      const channel = pc.createDataChannel(`file-transfer-${fileId}`, {
        ordered: true
      })
      
      channelsRef.current[fileId] = channel
      
      channel.binaryType = 'arraybuffer'
      channel.onopen = () => {
        // Send metadata first via data channel, or we already have it from WebSocket request.
        // Let's just start sending chunks.
        sendFileChunks(fileId, file, channel)
      }

      channel.onerror = (error) => {
        updateProgress(fileId, { status: 'error', error: 'Data channel error' })
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      sendMessage({
        type: 'webrtc-file-offer',
        targetSessionId: targetUserId,
        fileId,
        offer,
      })

    } catch (err) {
      updateProgress(fileId, { status: 'error', error: 'Failed to start WebRTC' })
    }
  }, [createPeerConnection, sendMessage, sendFileChunks, updateProgress])

  // Setup receiver channel listeners
  const setupReceiverChannel = useCallback((fileId: string, channel: RTCDataChannel) => {
    channelsRef.current[fileId] = channel
    channel.binaryType = 'arraybuffer'
    receiveBuffersRef.current[fileId] = []
    receivedBytesRef.current[fileId] = 0
    updateProgress(fileId, { status: 'transferring', progress: 0 })

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'EOF') {
            // Reconstruct file
            const blob = new Blob(receiveBuffersRef.current[fileId], { type: fileMetaRef.current[fileId]?.type || 'application/octet-stream' })
            
            // Read as Data URL to maintain existing chat interface compatibility
            const reader = new FileReader()
            reader.onload = (e) => {
              updateProgress(fileId, { 
                status: 'completed', 
                progress: 100,
                dataUrl: e.target?.result as string
              })
              cleanupTransfer(fileId)
            }
            reader.readAsDataURL(blob)
          }
        } catch (e) {
          // ignore parsing error if it's not JSON
        }
      } else if (event.data instanceof ArrayBuffer) {
        receiveBuffersRef.current[fileId].push(event.data)
        receivedBytesRef.current[fileId] += event.data.byteLength
        
        const total = expectedSizesRef.current[fileId]
        if (total) {
          updateProgress(fileId, { progress: Math.min(99, Math.round((receivedBytesRef.current[fileId] / total) * 100)) })
        }
      }
    }
  }, [updateProgress, cleanupTransfer])

  // Called by receiver to prepare for incoming WebRTC offer
  // We need to know the expected size and type for Blob creation
  const expectIncomingFile = useCallback((fileId: string, size: number, type: string, name: string) => {
    expectedSizesRef.current[fileId] = size
    fileMetaRef.current[fileId] = { type, name }
    updateProgress(fileId, { status: 'pending', progress: 0 })
  }, [updateProgress])

  useEffect(() => {
    const cleanupSignaling = addEventListener('webrtc-signaling', async (message) => {
      if (message.type === 'webrtc-file-offer') {
        const { fileId, offer, sessionId } = message
        try {
          const pc = createPeerConnection(sessionId, fileId)
          
          pc.ondatachannel = (event) => {
            setupReceiverChannel(fileId, event.channel)
          }

          await pc.setRemoteDescription(new RTCSessionDescription(offer))
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)

          sendMessage({
            type: 'webrtc-file-answer',
            targetSessionId: sessionId,
            fileId,
            answer,
          })
        } catch (err) {
          updateProgress(fileId, { status: 'error', error: 'Failed to accept offer' })
        }
      } 
      else if (message.type === 'webrtc-file-answer') {
        const { fileId, answer } = message
        const pc = peersRef.current[fileId]
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer))
        }
      }
      else if (message.type === 'webrtc-file-ice-candidate') {
        const { fileId, candidate } = message
        const pc = peersRef.current[fileId]
        if (pc && pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        }
      }
    })

    return cleanupSignaling
  }, [addEventListener, createPeerConnection, sendMessage, setupReceiverChannel, updateProgress])

  return {
    transfers,
    startWebRTCFileTransfer,
    expectIncomingFile,
  }
}
