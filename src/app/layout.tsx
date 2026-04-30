import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { HMRErrorSuppressor } from './hmr-error-suppressor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Hub - Local Network Communication',
  description: 'Connect, chat, and share files with anyone on your local network. No internet required.',
  keywords: ['local network', 'communication', 'chat', 'file sharing', 'WebRTC', 'LAN'],
  authors: [{ name: 'Hub Team' }],
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Hub" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <HMRErrorSuppressor />
        <div id="root" className="min-h-screen bg-background">
          {children}
        </div>
        <div id="modal-root" />
        <div id="toast-root" />
      </body>
    </html>
  )
}