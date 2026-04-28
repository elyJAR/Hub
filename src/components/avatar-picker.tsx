'use client'

import { useState } from 'react'

interface AvatarPickerProps {
  selected?: string
  onSelect: (avatar: string) => void
}

// Predefined avatar combinations (color + emoji)
const AVATAR_OPTIONS = [
  { id: 'blue-smile', color: 'bg-blue-500', emoji: '😊', label: 'Blue Smile' },
  { id: 'green-cool', color: 'bg-green-500', emoji: '😎', label: 'Green Cool' },
  { id: 'purple-happy', color: 'bg-purple-500', emoji: '😄', label: 'Purple Happy' },
  { id: 'red-love', color: 'bg-red-500', emoji: '😍', label: 'Red Love' },
  { id: 'yellow-wink', color: 'bg-yellow-500', emoji: '😉', label: 'Yellow Wink' },
  { id: 'pink-cute', color: 'bg-pink-500', emoji: '🥰', label: 'Pink Cute' },
  { id: 'indigo-think', color: 'bg-indigo-500', emoji: '🤔', label: 'Indigo Think' },
  { id: 'teal-laugh', color: 'bg-teal-500', emoji: '😂', label: 'Teal Laugh' },
  { id: 'orange-party', color: 'bg-orange-500', emoji: '🥳', label: 'Orange Party' },
  { id: 'cyan-zen', color: 'bg-cyan-500', emoji: '😌', label: 'Cyan Zen' },
  { id: 'lime-excited', color: 'bg-lime-500', emoji: '🤩', label: 'Lime Excited' },
  { id: 'rose-shy', color: 'bg-rose-500', emoji: '😊', label: 'Rose Shy' },
]

export function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  const [hoveredAvatar, setHoveredAvatar] = useState<string>()

  return (
    <div className="space-y-3">
      {/* Avatar Grid */}
      <div className="grid grid-cols-6 gap-2">
        {AVATAR_OPTIONS.map((avatar) => {
          const isSelected = selected === avatar.id
          const isHovered = hoveredAvatar === avatar.id

          return (
            <button
              key={avatar.id}
              type="button"
              onClick={() => onSelect(avatar.id)}
              onMouseEnter={() => setHoveredAvatar(avatar.id)}
              onMouseLeave={() => setHoveredAvatar(undefined)}
              className={`
                relative w-12 h-12 rounded-full flex items-center justify-center text-lg
                transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                ${avatar.color}
                ${isSelected 
                  ? 'ring-2 ring-primary ring-offset-2 scale-110' 
                  : 'hover:scale-105'
                }
                ${isHovered && !isSelected ? 'ring-1 ring-gray-300' : ''}
              `}
              title={avatar.label}
            >
              <span className="text-white filter drop-shadow-sm">
                {avatar.emoji}
              </span>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Avatar Preview */}
      {selected && (
        <div className="flex items-center justify-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            AVATAR_OPTIONS.find(a => a.id === selected)?.color
          }`}>
            <span className="text-white text-sm filter drop-shadow-sm">
              {AVATAR_OPTIONS.find(a => a.id === selected)?.emoji}
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {AVATAR_OPTIONS.find(a => a.id === selected)?.label}
          </span>
        </div>
      )}

      {/* Random Selection Button */}
      <button
        type="button"
        onClick={() => {
          const randomAvatar = AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)]
          onSelect(randomAvatar.id)
        }}
        className="w-full py-2 px-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-md hover:border-gray-400 dark:hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        🎲 Pick random avatar
      </button>
    </div>
  )
}

// Utility function to get avatar display info
export function getAvatarInfo(avatarId?: string) {
  if (!avatarId) return null
  return AVATAR_OPTIONS.find(a => a.id === avatarId) || null
}

// Component to display an avatar
interface AvatarDisplayProps {
  avatarId?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AvatarDisplay({ avatarId, size = 'md', className = '' }: AvatarDisplayProps) {
  const avatar = getAvatarInfo(avatarId)
  
  if (!avatar) {
    // Default avatar if none selected
    return (
      <div className={`
        rounded-full bg-gray-400 flex items-center justify-center text-white
        ${size === 'sm' ? 'w-6 h-6 text-xs' : ''}
        ${size === 'md' ? 'w-8 h-8 text-sm' : ''}
        ${size === 'lg' ? 'w-12 h-12 text-lg' : ''}
        ${className}
      `}>
        <span>👤</span>
      </div>
    )
  }

  return (
    <div className={`
      rounded-full flex items-center justify-center text-white filter drop-shadow-sm
      ${avatar.color}
      ${size === 'sm' ? 'w-6 h-6 text-xs' : ''}
      ${size === 'md' ? 'w-8 h-8 text-sm' : ''}
      ${size === 'lg' ? 'w-12 h-12 text-lg' : ''}
      ${className}
    `}>
      <span>{avatar.emoji}</span>
    </div>
  )
}