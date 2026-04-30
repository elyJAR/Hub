'use client'

import { useEffect, useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff, User } from 'lucide-react'
import { AvatarDisplay } from './avatar-picker'

interface CallInterfaceProps {
  isIncoming: boolean
  remoteUserName: string
  remoteAvatar?: string
  callDuration: number
  isMuted: boolean
  onAccept?: () => void
  onDecline?: () => void
  onEnd?: () => void
  onToggleMute?: () => void
}

export function CallInterface({
  isIncoming,
  remoteUserName,
  remoteAvatar,
  callDuration,
  isMuted,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
}: CallInterfaceProps) {
  const [displayDuration, setDisplayDuration] = useState('00:00')

  // Format call duration
  useEffect(() => {
    const minutes = Math.floor(callDuration / 60)
    const seconds = callDuration % 60
    setDisplayDuration(
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    )
  }, [callDuration])

  if (isIncoming) {
    // Incoming call UI
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          {/* Avatar */}
          <div className="mb-6">
            <div className="w-24 h-24 mx-auto mb-4">
              <AvatarDisplay avatarId={remoteAvatar} size="xl" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {remoteUserName}
            </h2>
            <p className="text-muted-foreground">Incoming voice call...</p>
          </div>

          {/* Ringing animation */}
          <div className="mb-8">
            <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center animate-pulse">
              <Phone className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={onDecline}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
              title="Decline"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
            <button
              onClick={onAccept}
              className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors shadow-lg animate-bounce"
              title="Accept"
            >
              <Phone className="w-8 h-8 text-white" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active call UI
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-900 to-purple-900 z-50 flex items-center justify-center">
      <div className="text-center text-white">
        {/* Avatar */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto mb-4 ring-4 ring-white/20 rounded-full">
            <AvatarDisplay avatarId={remoteAvatar} size="xl" />
          </div>
          <h2 className="text-3xl font-bold mb-2">{remoteUserName}</h2>
          <p className="text-white/70 text-lg">{displayDuration}</p>
        </div>

        {/* Audio visualizer placeholder */}
        <div className="mb-12 flex justify-center space-x-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-2 bg-white/50 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 40 + 20}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Call controls */}
        <div className="flex justify-center space-x-6">
          {/* Mute button */}
          <button
            onClick={onToggleMute}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isMuted
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/20 hover:bg-white/30'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-8 h-8 text-white" />
            ) : (
              <Mic className="w-8 h-8 text-white" />
            )}
          </button>

          {/* End call button */}
          <button
            onClick={onEnd}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors shadow-lg"
            title="End Call"
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
        </div>

        {/* Status indicators */}
        <div className="mt-8 text-sm text-white/50">
          <p>Voice call in progress</p>
          {isMuted && <p className="text-red-400 mt-1">Microphone muted</p>}
        </div>
      </div>

      {/* Hidden audio element for remote stream */}
      <audio id="remote-audio" autoPlay />
    </div>
  )
}
