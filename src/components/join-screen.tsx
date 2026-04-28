'use client'

import { useState, useEffect } from 'react'
import { AvatarPicker } from './avatar-picker'

interface JoinScreenProps {
  onJoin: (displayName: string, avatar?: string) => Promise<void>
  isConnecting: boolean
  error: string | null
}

export function JoinScreen({ onJoin, isConnecting, error }: JoinScreenProps) {
  const [displayName, setDisplayName] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string>()
  const [isJoining, setIsJoining] = useState(false)
  const [validationError, setValidationError] = useState<string>()

  // Clear validation error when user types
  useEffect(() => {
    if (validationError && displayName) {
      setValidationError(undefined)
    }
  }, [displayName, validationError])

  const validateDisplayName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Display name is required'
    }
    if (name.trim().length < 3) {
      return 'Display name must be at least 3 characters'
    }
    if (name.trim().length > 50) {
      return 'Display name must be less than 50 characters'
    }
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(name.trim())) {
      return 'Display name can only contain letters, numbers, spaces, hyphens, and underscores'
    }
    return undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedName = displayName.trim()
    const nameError = validateDisplayName(trimmedName)
    
    if (nameError) {
      setValidationError(nameError)
      return
    }

    setIsJoining(true)
    setValidationError(undefined)

    try {
      await onJoin(trimmedName, selectedAvatar)
    } catch (error) {
      console.error('Failed to join:', error)
      setValidationError(error instanceof Error ? error.message : 'Failed to join session')
    } finally {
      setIsJoining(false)
    }
  }

  const isLoading = isConnecting || isJoining
  const currentError = validationError || error

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <svg
              className="w-8 h-8 text-primary-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Connect with others on your local network
          </p>
        </div>

        {/* Join Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Choose your avatar
              </label>
              <AvatarPicker
                selected={selectedAvatar}
                onSelect={setSelectedAvatar}
              />
            </div>

            {/* Display Name Input */}
            <div>
              <label 
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className={`w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 ${
                  currentError ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isLoading}
                maxLength={50}
                autoComplete="off"
                autoFocus
              />
              {displayName && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {displayName.trim().length}/50 characters
                </p>
              )}
            </div>

            {/* Error Message */}
            {currentError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <div className="flex">
                  <svg
                    className="w-5 h-5 text-red-400 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    {currentError}
                  </p>
                </div>
              </div>
            )}

            {/* Connection Status */}
            {isConnecting && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Connecting to Hub server...
                  </p>
                </div>
              </div>
            )}

            {/* Join Button */}
            <button
              type="submit"
              disabled={isLoading || !displayName.trim()}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                isLoading || !displayName.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-600 focus:bg-primary-700'
              }`}
            >
              {isJoining ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining...
                </div>
              ) : (
                'Join Hub'
              )}
            </button>
          </form>

          {/* Network Info */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Connected to local network
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {window.location.host}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No internet required • Local network only • Privacy first
          </p>
        </div>
      </div>
    </div>
  )
}