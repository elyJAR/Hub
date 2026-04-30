'use client'

import { Users, Loader2 } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="text-center">
        {/* Hub Logo */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-6">
          <Users className="w-8 h-8 text-primary-foreground" />
        </div>

        {/* Loading Animation */}
        <div className="mb-4">
          <div className="inline-flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>

        {/* Loading Message */}
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Hub
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {message}
        </p>

        {/* Network Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Local network communication platform
          </p>
        </div>
      </div>
    </div>
  )
}