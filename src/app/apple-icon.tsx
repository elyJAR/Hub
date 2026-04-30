import { ImageResponse } from 'next/og'

// Image metadata
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Apple icon component
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '22.5%',
          fontWeight: 'bold',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        H
      </div>
    ),
    {
      ...size,
    }
  )
}
