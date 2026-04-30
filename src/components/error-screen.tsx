'use client'

import { AlertTriangle } from 'lucide-react'

interface ErrorScreenProps {
  title?: string
  message: string
  onRetry?: () => void
  showRetry?: boolean
}

export function ErrorScreen({ 
  title = 'Connection Error', 
  message, 
  onRetry, 
  showRetry = true 
}: ErrorScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* Error Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Error Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h1>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {message}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="w-full bg-primary hover:bg-primary-600 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Try Again
              </button>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reload Page
            </button>
          </div>
        </div>

        {/* Troubleshooting Tips */}
        <div className="mt-6 text-left bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Troubleshooting Tips:
          </h3>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {message.includes('npm run dev') ? (
              <>
                <li>• Make sure the server is running with <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">npm run dev</code></li>
                <li>• Don't use <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">next dev</code> - it won't start the WebSocket server</li>
                <li>• Check the terminal for any server errors</li>
              </>
            ) : (
              <>
                <li>• Check your network connection</li>
                <li>• Ensure you're on the same network as the Hub server</li>
                <li>• Try refreshing the page</li>
                <li>• Contact the person who shared this Hub link</li>
              </>
            )}
          </ul>
        </div>

        {/* Network Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Trying to connect to: {window.location.host}
          </p>
        </div>
      </div>
    </div>
  )
}