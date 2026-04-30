'use client'

import { useEffect } from 'react'

/**
 * Suppresses the HMR WebSocket error in development
 * This error is expected when using a custom server with Next.js
 * HMR works via polling instead of WebSocket
 */
export function HMRErrorSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Store original console.error
      const originalError = console.error

      // Override console.error to filter HMR WebSocket errors
      console.error = (...args: any[]) => {
        // Check if this is the HMR WebSocket error
        const errorString = args.join(' ')
        
        if (
          errorString.includes('_next/webpack-hmr') ||
          errorString.includes('WebSocket connection') && errorString.includes('webpack-hmr')
        ) {
          // Silently ignore HMR WebSocket errors
          return
        }

        // Pass through all other errors
        originalError.apply(console, args)
      }

      // Cleanup on unmount
      return () => {
        console.error = originalError
      }
    }
  }, [])

  return null
}
