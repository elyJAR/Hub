import { useState, useEffect, useRef, useCallback } from 'react'
import { useWebSocketContext } from '@/contexts/websocket-context'
import { toast } from '@/lib/toast'

interface WebRTCState {
  isInCall: boolean
  isCallIncoming: boolean
  isMuted: boolean
  callDuration: number
  callError: string | null
  remoteUserId: string | null
  remoteUserName: string | null
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
  })

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([])

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
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

  // Start outgoing call
  const startCall = useCallback(async (targetUserId: string) => {
    try {
      setState(prev => ({ ...prev, callError: null }))

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      // Initialize peer connection
      const pc = initializePeerConnection(targetUserId)

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Create and send offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

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

      // Start call timer
      callTimerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }))
      }, 1000)

    } catch (error) {
      console.error('Error starting call:', error)
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
    try {
      if (!state.remoteUserId) {
        throw new Error('No incoming call')
      }

      setState(prev => ({ ...prev, callError: null, isCallIncoming: false }))

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      // Peer connection should already be initialized from the offer
      const pc = peerConnectionRef.current
      if (!pc) {
        throw new Error('Peer connection not initialized')
      }

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream)
      })

      // Create and send answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

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

      // Add any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      }
      pendingCandidatesRef.current = []

    } catch (error) {
      console.error('Error accepting call:', error)
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
      if (message.type === 'webrtc-offer') {
        // Incoming call
        setState(prev => ({
          ...prev,
          isCallIncoming: true,
          remoteUserId: message.sessionId,
          remoteUserName: message.fromDisplayName,
        }))

        toast.info(`Incoming call from ${message.fromDisplayName}`)

        // Initialize peer connection
        const pc = initializePeerConnection(message.sessionId)
        
        // Set remote description
        await pc.setRemoteDescription(new RTCSessionDescription(message.offer))
      }
      
      else if (message.type === 'webrtc-answer') {
        // Call accepted
        const pc = peerConnectionRef.current
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(message.answer))
          
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
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate))
        } else {
          // Queue candidate if remote description not set yet
          pendingCandidatesRef.current.push(message.candidate)
        }
      }
      
      else if (message.type === 'webrtc-call-declined') {
        setState(prev => ({
          ...prev,
          callError: 'Call declined',
        }))
        toast.error('Call was declined')
        cleanup()
      }
      
      else if (message.type === 'webrtc-call-ended') {
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
