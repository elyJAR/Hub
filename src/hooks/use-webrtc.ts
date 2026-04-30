import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { soundManager } from '@/lib/sound-manager'
import { toast } from '@/lib/toast'

interface WebRTCState {
  isInCall: boolean
  isCallIncoming: boolean
  isMuted: boolean
  callDuration: number
  callError: string | null
  remoteUserId: string | null
  remoteUserName: string | null
  connectionQuality: 'good' | 'fair' | 'poor'
}

interface UseWebRTCReturn extends WebRTCState {
  startCall: (targetUserId: string) => Promise<void>
  acceptCall: () => Promise<void>
  declineCall: () => void
  endCall: () => void
  toggleMute: () => void
}

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

export function useWebRTC(): UseWebRTCReturn {
  const { addEventListener, sendMessage } = useWebSocketContext()
  
  const [state, setState] = useState<WebRTCState>({
    isInCall: false,
    isCallIncoming: false,
    isMuted: false,
    callDuration: 0,
    callError: null,
    remoteUserId: null,
    remoteUserName: null,
    connectionQuality: 'good',
  })

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const qualityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Close peer connection
    // Stop all sounds
    soundManager.stopAll()

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clear timers
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    if (qualityTimerRef.current) {
      clearInterval(qualityTimerRef.current)
      qualityTimerRef.current = null
    }

    // Clear pending candidates
    pendingCandidatesRef.current = []

    setState(prev => ({
      ...prev,
      isInCall: false,
      isCallIncoming: false,
      callDuration: 0,
      remoteUserId: null,
      remoteUserName: null,
    }))
  }, [])

  // Initialize peer connection
  const initializePeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peerConnectionRef.current = pc

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendMessage({
          type: 'webrtc-ice-candidate',
          targetSessionId: targetUserId,
          candidate: event.candidate.toJSON(),
        })
      }
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind)
      remoteStreamRef.current = event.streams[0]
      
      // Play remote audio
      const audioElement = document.getElementById('remote-audio') as HTMLAudioElement
      if (audioElement) {
        audioElement.srcObject = event.streams[0]
        audioElement.play().catch(err => console.error('Error playing remote audio:', err))
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState)
      
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setState(prev => ({
          ...prev,
          callError: 'Connection lost',
        }))
        cleanup()
      }
    }

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState)
      
      if (pc.iceConnectionState === 'failed') {
        setState(prev => ({
          ...prev,
          callError: 'Failed to establish connection',
        }))
        cleanup()
      }
    }

    return pc
  }, [sendMessage, cleanup])

  const monitorConnectionQuality = useCallback(async () => {
    const pc = peerConnectionRef.current
    if (!pc) return

    try {
      const stats = await pc.getStats()
      let totalPacketsLost = 0
      let totalPacketsReceived = 0

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          totalPacketsLost = report.packetsLost || 0
          totalPacketsReceived = report.packetsReceived || 0
        }
      })

      if (totalPacketsReceived > 0) {
        const lossRate = totalPacketsLost / (totalPacketsLost + totalPacketsReceived)
        if (lossRate > 0.1) {
          setState(prev => ({ ...prev, connectionQuality: 'poor' }))
        } else if (lossRate > 0.02) {
          setState(prev => ({ ...prev, connectionQuality: 'fair' }))
        } else {
          setState(prev => ({ ...prev, connectionQuality: 'good' }))
        }
      }
    } catch (e) {
      console.error('Failed to monitor connection quality', e)
    }
  }, [])

  // Start outgoing call
  const startCall = useCallback(async (targetUserId: string) => {
    console.log('[useWebRTC] startCall initiated for target:', targetUserId)
    if (!targetUserId) {
      console.error('[useWebRTC] startCall failed: No targetUserId provided')
      toast.error('Cannot start call: Invalid target user')
      return
    }

    try {
      setState(prev => ({ ...prev, callError: null }))

      console.log('[useWebRTC] Requesting microphone permission...')
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('[useWebRTC] Microphone permission granted, stream acquired')
      localStreamRef.current = stream

      // Initialize peer connection
      console.log('[useWebRTC] Initializing PeerConnection...')
      const pc = initializePeerConnection(targetUserId)

      // Add local stream tracks
      console.log('[useWebRTC] Adding local tracks to PeerConnection...')
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Create and send offer
      console.log('[useWebRTC] Creating SDP offer...')
      const offer = await pc.createOffer()
      console.log('[useWebRTC] Setting local description...')
      await pc.setLocalDescription(offer)

      console.log('[useWebRTC] Sending webrtc-offer signaling message...')
      sendMessage({
        type: 'webrtc-offer',
        targetSessionId: targetUserId,
        offer: offer,
      })

      setState(prev => ({
        ...prev,
        isInCall: true,
        remoteUserId: targetUserId,
      }))

      toast.info('Calling...')

      // Play outgoing ring
      soundManager.play('outgoingCall', true)

      // Start call timer
      callTimerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }))
      }, 1000)

      // Start quality monitoring
      qualityTimerRef.current = setInterval(monitorConnectionQuality, 5000)

    } catch (error) {
      console.error('[useWebRTC] Error starting call:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to start call'
      setState(prev => ({
        ...prev,
        callError: errorMessage,
      }))
      toast.error(errorMessage)
      cleanup()
    }
  }, [initializePeerConnection, sendMessage, cleanup])

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    console.log('[useWebRTC] acceptCall initiated')
    try {
      if (!state.remoteUserId) {
        throw new Error('No incoming call')
      }

      setState(prev => ({ ...prev, callError: null, isCallIncoming: false }))
      
      // Stop ringing
      soundManager.stopAll()

      console.log('[useWebRTC] Requesting microphone permission for acceptance...')
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log('[useWebRTC] Microphone permission granted')
      localStreamRef.current = stream

      // Peer connection should already be initialized from the offer
      const pc = peerConnectionRef.current
      if (!pc) {
        throw new Error('Peer connection not initialized')
      }

      console.log('[useWebRTC] Adding local tracks to PeerConnection...')
      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      console.log('[useWebRTC] Creating SDP answer...')
      // Create and send answer
      const answer = await pc.createAnswer()
      console.log('[useWebRTC] Setting local description...')
      await pc.setLocalDescription(answer)

      console.log('[useWebRTC] Sending webrtc-answer signaling message...')
      sendMessage({
        type: 'webrtc-answer',
        targetSessionId: state.remoteUserId,
        answer: answer,
      })

      setState(prev => ({
        ...prev,
        isInCall: true,
      }))

      toast.success('Call connected')

      // Start call timer
      callTimerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }))
      }, 1000)

      // Start quality monitoring
      qualityTimerRef.current = setInterval(monitorConnectionQuality, 5000)

      console.log('[useWebRTC] Processing pending ICE candidates:', pendingCandidatesRef.current.length)
      // Add any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
      pendingCandidatesRef.current = []

    } catch (error) {
      console.error('[useWebRTC] Error accepting call:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept call'
      setState(prev => ({
        ...prev,
        callError: errorMessage,
      }))
      toast.error(errorMessage)
      cleanup()
    }
  }, [state.remoteUserId, sendMessage, cleanup])

  // Decline incoming call
  const declineCall = useCallback(() => {
    console.log('[useWebRTC] declineCall initiated')
    soundManager.stopAll()
    if (state.remoteUserId) {
      sendMessage({
        type: 'webrtc-call-declined',
        targetSessionId: state.remoteUserId,
      } as any)
    }
    toast.info('Call declined')
    cleanup()
  }, [state.remoteUserId, sendMessage, cleanup])

  // End call
  const endCall = useCallback(() => {
    console.log('[useWebRTC] endCall initiated')
    if (state.remoteUserId) {
      sendMessage({
        type: 'webrtc-call-ended',
        targetSessionId: state.remoteUserId,
      } as any)
    }
    toast.info('Call ended')
    cleanup()
  }, [state.remoteUserId, sendMessage, cleanup])

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setState(prev => ({
          ...prev,
          isMuted: !audioTrack.enabled,
        }))
      }
    }
  }, [])

  // Listen for WebRTC signaling messages
  useEffect(() => {
    const cleanupOffer = addEventListener('webrtc-signaling', async (message) => {
      console.log('[useWebRTC] Received signaling message:', message.type)
      if (message.type === 'webrtc-offer') {
        const { offer, sessionId, fromDisplayName } = message
        console.log('[useWebRTC] Handling incoming offer from:', fromDisplayName)
        
        // Play incoming ring
        soundManager.play('incomingCall', true)

        setState(prev => ({
          ...prev,
          isCallIncoming: true,
          remoteUserId: sessionId,
          remoteUserName: fromDisplayName,
        }))

        // Initialize peer connection
        const pc = initializePeerConnection(sessionId)
        
        // Set remote description
        console.log('[useWebRTC] Setting remote description (offer)...')
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
      }
      
      else if (message.type === 'webrtc-answer') {
        const { answer } = message
        console.log('[useWebRTC] Received answer')
        
        // Stop outgoing ring
        soundManager.stop('outgoingCall')
        
        const pc = peerConnectionRef.current
        if (pc) {
          console.log('[useWebRTC] Setting remote description (answer)...')
          await pc.setRemoteDescription(new RTCSessionDescription(message.answer))
          
          console.log('[useWebRTC] Processing pending ICE candidates:', pendingCandidatesRef.current.length)
          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          }
          pendingCandidatesRef.current = []
        }
      }
      
      else if (message.type === 'webrtc-ice-candidate') {
        // ICE candidate received
        const pc = peerConnectionRef.current
        if (pc && pc.remoteDescription) {
          console.log('[useWebRTC] Adding ICE candidate...')
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate))
        } else {
          console.log('[useWebRTC] Queuing ICE candidate (waiting for remote description)')
          // Queue candidate if remote description not set yet
          pendingCandidatesRef.current.push(message.candidate)
        }
      }
      
      else if (message.type === 'webrtc-call-declined') {
        console.log('[useWebRTC] Call was declined by remote user')
        setState(prev => ({
          ...prev,
          callError: 'Call declined',
        }))
        toast.error('Call was declined')
        cleanup()
      }
      
      else if (message.type === 'webrtc-call-ended') {
        console.log('[useWebRTC] Call ended by remote user')
        toast.info('Call ended by other user')
        cleanup()
      }
    })

    return cleanupOffer
  }, [addEventListener, initializePeerConnection, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    ...state,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  }
}
