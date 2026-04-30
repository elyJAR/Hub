'use client'

const SOUNDS = {
  incomingCall: 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3', // Phone ring
  messageReceived: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Pop/Ding
  outgoingCall: 'https://assets.mixkit.co/active_storage/sfx/1358/1358-preview.mp3', // Outgoing ring
}

class SoundManager {
  private audios: Record<string, HTMLAudioElement> = {}

  constructor() {
    if (typeof window !== 'undefined') {
      Object.entries(SOUNDS).forEach(([key, url]) => {
        const audio = new Audio(url)
        audio.preload = 'auto'
        this.audios[key] = audio
      })
    }
  }

  play(sound: keyof typeof SOUNDS, loop: boolean = false) {
    const audio = this.audios[sound]
    if (audio) {
      const isSoundsEnabled = localStorage.getItem('hub-sounds') !== 'false'
      if (!isSoundsEnabled) return

      audio.loop = loop
      audio.currentTime = 0
      audio.play().catch(e => console.warn('Failed to play sound:', e))
    }
  }

  stop(sound: keyof typeof SOUNDS) {
    const audio = this.audios[sound]
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
  }

  stopAll() {
    Object.values(this.audios).forEach(audio => {
      audio.pause()
      audio.currentTime = 0
    })
  }
}

export const soundManager = new SoundManager()
