'use client'

import { useState, useEffect } from 'react'
import { AvatarPicker } from './avatar-picker'
import { X } from 'lucide-react'

interface SessionData {
  sessionId: string
  persistentId: string
  token: string
  displayName: string
  avatar?: string
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  session: SessionData
}

export function SettingsModal({ isOpen, onClose, session }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'privacy'>('profile')
  
  // Profile State
  const [displayName, setDisplayName] = useState(session.displayName)
  const [selectedAvatar, setSelectedAvatar] = useState<string | undefined>(session.avatar)
  const [isSaving, setIsSaving] = useState(false)

  // Appearance State
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

  // Notifications State
  const [soundsEnabled, setSoundsEnabled] = useState(true)
  const [desktopEnabled, setDesktopEnabled] = useState(true)

  // Load preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('hub-theme') as any
      if (savedTheme) setTheme(savedTheme)

      const savedSounds = localStorage.getItem('hub-sounds')
      if (savedSounds !== null) setSoundsEnabled(savedSounds === 'true')

      const savedDesktop = localStorage.getItem('hub-desktop-notifications')
      if (savedDesktop !== null) setDesktopEnabled(savedDesktop === 'true')

      // Load trusted users
      const savedTrusted = localStorage.getItem('hub-trusted-users-metadata')
      if (savedTrusted) {
        try {
          setTrustedUsers(JSON.parse(savedTrusted))
        } catch (e) {
          console.error('Failed to parse trusted users metadata', e)
        }
      }
    }
  }, [isOpen])

  const [trustedUsers, setTrustedUsers] = useState<{persistentId: string, displayName: string}[]>([])

  const removeTrustedUser = (persistentId: string) => {
    const updated = trustedUsers.filter(u => u.persistentId !== persistentId)
    setTrustedUsers(updated)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('hub-trusted-users-metadata', JSON.stringify(updated))
      localStorage.setItem('hub-trusted-users', JSON.stringify(updated.map(u => u.persistentId)))
    }
  }

  // Apply theme
  useEffect(() => {
    if (typeof window === 'undefined') return
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
    localStorage.setItem('hub-theme', theme)
  }, [theme])

  // Save Notifications
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hub-sounds', soundsEnabled.toString())
      localStorage.setItem('hub-desktop-notifications', desktopEnabled.toString())
    }
  }, [soundsEnabled, desktopEnabled])

  // Request notification permissions
  const handleDesktopToggle = async (enabled: boolean) => {
    if (enabled && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission()
        setDesktopEnabled(permission === 'granted')
        return
      }
    }
    setDesktopEnabled(enabled)
  }

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || displayName.length < 3) return

    setIsSaving(true)
    
    // Update the session in local storage
    if (typeof window !== 'undefined') {
      const savedStr = localStorage.getItem('hub-session')
      if (savedStr) {
        try {
          const savedSession = JSON.parse(savedStr)
          savedSession.displayName = displayName.trim()
          savedSession.avatar = selectedAvatar
          localStorage.setItem('hub-session', JSON.stringify(savedSession))
          
          // Reload the page to auto-rejoin with new details
          window.location.reload()
        } catch (error) {
          console.error('Failed to save profile', error)
          setIsSaving(false)
        }
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col md:flex-row">
        
        {/* Sidebar Tabs */}
        <div className="md:w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 space-y-1 overflow-y-auto hidden md:block">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 px-2">Settings</h2>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              activeTab === 'profile' 
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Profile
          </button>
          
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              activeTab === 'appearance' 
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Appearance
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              activeTab === 'notifications' 
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Notifications
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              activeTab === 'privacy' 
                ? 'bg-primary text-primary-foreground font-medium' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Privacy & Friends
          </button>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden flex overflow-x-auto bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 min-w-[100px] text-center px-3 py-2 rounded-md transition-colors text-sm ${
              activeTab === 'profile' ? 'bg-primary text-primary-foreground font-medium' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 min-w-[100px] text-center px-3 py-2 rounded-md transition-colors text-sm ${
              activeTab === 'appearance' ? 'bg-primary text-primary-foreground font-medium' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 min-w-[100px] text-center px-3 py-2 rounded-md transition-colors text-sm ${
              activeTab === 'notifications' ? 'bg-primary text-primary-foreground font-medium' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 min-w-[100px] text-center px-3 py-2 rounded-md transition-colors text-sm ${
              activeTab === 'privacy' ? 'bg-primary text-primary-foreground font-medium' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            Privacy
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-h-[400px]">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize md:hidden">
              {activeTab}
            </h2>
            <div className="hidden md:block" /> {/* Spacer */}
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSave} className="space-y-6 max-w-sm mx-auto md:mx-0">
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                    minLength={3}
                    maxLength={50}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This is how others will see you in the network.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Avatar
                  </label>
                  <AvatarPicker
                    selected={selectedAvatar}
                    onSelect={setSelectedAvatar}
                  />
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={isSaving || !displayName.trim() || displayName.trim() === session.displayName && selectedAvatar === session.avatar}
                    className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex justify-center items-center"
                  >
                    {isSaving ? 'Updating...' : 'Update Profile & Rejoin'}
                  </button>
                  <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                    Updating your profile will briefly reconnect you to the network.
                  </p>
                </div>
              </form>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6 max-w-sm mx-auto md:mx-0">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Theme</h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={theme === 'light'}
                        onChange={() => setTheme('light')}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="text-gray-900 dark:text-gray-100">Light</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value="dark"
                        checked={theme === 'dark'}
                        onChange={() => setTheme('dark')}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="text-gray-900 dark:text-gray-100">Dark</span>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value="system"
                        checked={theme === 'system'}
                        onChange={() => setTheme('system')}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="text-gray-900 dark:text-gray-100">System (match device)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 max-w-sm mx-auto md:mx-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Sound Effects</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Play sounds for new messages and connection requests.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={soundsEnabled} onChange={(e) => setSoundsEnabled(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Desktop Notifications</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Show native browser notifications for new activity.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={desktopEnabled} onChange={(e) => handleDesktopToggle(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
                    <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 flex flex-col space-y-2">
                      <p className="text-xs text-primary font-medium">Browser permission is required for desktop notifications.</p>
                      <button
                        onClick={() => handleDesktopToggle(true)}
                        className="text-xs bg-primary text-primary-foreground py-1.5 px-3 rounded hover:bg-primary/90 transition-colors self-start"
                      >
                        Request Browser Permission
                      </button>
                    </div>
                  )}
                  
                  {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'denied' && (
                    <p className="text-[10px] text-red-500 italic">
                      Notifications are blocked by your browser settings. Please enable them in your browser's site settings to use this feature.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Trusted Users</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                    These users can connect with you automatically. Removing them will require a new connection request.
                  </p>
                  
                  {trustedUsers.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                      <p className="text-sm text-gray-500">No trusted users yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {trustedUsers.map((user) => (
                        <div 
                          key={user.persistentId} 
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                              {user.displayName[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.displayName}
                            </span>
                          </div>
                          <button
                            onClick={() => removeTrustedUser(user.persistentId)}
                            className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            Remove Trust
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
