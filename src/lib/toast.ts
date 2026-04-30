/**
 * Toast Notification System
 * Simple, lightweight toast notifications for user feedback
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

const defaultOptions: Required<ToastOptions> = {
  duration: 3000,
  position: 'bottom-right',
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
}

const typeStyles = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  info: 'bg-blue-500 text-white',
  warning: 'bg-yellow-500 text-white',
}

const typeIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
}

export function showToast(
  message: string,
  type: ToastType = 'info',
  options: ToastOptions = {}
) {
  const { duration, position } = { ...defaultOptions, ...options }

  // Create toast container if it doesn't exist
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.className = 'fixed z-50 pointer-events-none'
    document.body.appendChild(container)
  }

  // Create toast element
  const toast = document.createElement('div')
  toast.className = `
    ${positionClasses[position]}
    ${typeStyles[type]}
    fixed px-4 py-3 rounded-lg shadow-lg z-50 
    animate-slide-up pointer-events-auto
    flex items-center space-x-2 max-w-md
  `

  // Add icon
  const icon = document.createElement('span')
  icon.className = 'text-lg font-bold'
  icon.textContent = typeIcons[type]
  toast.appendChild(icon)

  // Add message
  const messageEl = document.createElement('span')
  messageEl.textContent = message
  toast.appendChild(messageEl)

  document.body.appendChild(toast)

  // Remove after duration
  setTimeout(() => {
    toast.classList.add('animate-fade-out')
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, duration)
}

// Convenience methods
export const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
}
