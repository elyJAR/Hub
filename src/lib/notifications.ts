'use client'

export class NotificationManager {
  private static instance: NotificationManager
  private permission: NotificationPermission = 'default'

  private constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission
    }
  }

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied'
    }

    if (Notification.permission === 'default') {
      this.permission = await Notification.requestPermission()
    }
    return this.permission
  }

  public notify(title: string, options?: NotificationOptions) {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (this.permission !== 'granted') return

    // Only show notification if page is hidden
    if (document.visibilityState === 'visible') return

    try {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        ...options
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (e) {
      console.error('Failed to show notification', e)
    }
  }
}

export const notificationManager = NotificationManager.getInstance()
