import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocketServer, WebSocket, RawData } from 'ws'
import { SessionManager } from './src/lib/session-manager'
import { WebSocketMessageHandler } from './src/lib/websocket-handler'
import { getLocalNetworkIPs } from './src/lib/network-utils'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOST || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

async function startServer() {
  try {
    await app.prepare()
    
    // Create HTTP server
    const server = createServer(async (req, res) => {
      try {
        // Skip Next.js handling for WebSocket endpoint
        if (req.url === '/ws') {
          // If it's not an upgrade request, return 426 Upgrade Required
          if (req.headers.upgrade?.toLowerCase() !== 'websocket') {
            res.writeHead(426, { 'Content-Type': 'text/plain' })
            res.end('This endpoint requires WebSocket upgrade')
            return
          }
          // Otherwise, let the WebSocket server handle the upgrade
          return
        }
        
        const parsedUrl = parse(req.url!, true)
        await handle(req, res, parsedUrl)
      } catch (err) {
        console.error('Error occurred handling', req.url, err)
        res.statusCode = 500
        res.end('internal server error')
      }
    })

    // Create WebSocket server
    const wss = new WebSocketServer({ 
      noServer: true, // Use noServer mode to manually handle upgrades
      perMessageDeflate: true,
      maxPayload: 1024 * 1024, // 1MB max message size
    })

    // Handle WebSocket upgrade requests manually
    server.on('upgrade', (req, socket, head) => {
      const { pathname } = parse(req.url || '', true)
      
      // Only handle /ws path for our WebSocket server
      if (pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req)
        })
      } else {
        // For all other paths (including HMR), reject the upgrade
        // Next.js HMR doesn't work well with custom servers in this setup
        // This is expected behavior - HMR will fall back to polling
        socket.destroy()
      }
    })

    // Initialize session manager and message handler
    const sessionManager = new SessionManager()
    const messageHandler = new WebSocketMessageHandler(sessionManager)

    // WebSocket connection handling
    wss.on('connection', (ws: WebSocket, req) => {
      console.log('New WebSocket connection from', req.socket.remoteAddress)
      
      // Set up connection
      messageHandler.handleConnection(ws)
      
      // Handle messages
      ws.on('message', (data: RawData) => {
        messageHandler.handleMessage(ws, data)
      })
      
      // Handle disconnection
      ws.on('close', (code, reason) => {
        console.log('WebSocket disconnected:', code, reason.toString())
        messageHandler.handleDisconnection(ws)
      })
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
        messageHandler.handleDisconnection(ws)
      })
    })

    // Periodic cleanup of inactive sessions
    setInterval(() => {
      sessionManager.cleanupInactiveSessions()
    }, 60000) // Every minute

    // Start server
    server.listen(port, hostname, () => {
      const networkIPs = getLocalNetworkIPs()
      
      console.log('\n🚀 Hub Server Started')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`📍 Local:    http://localhost:${port}`)
      
      networkIPs.forEach(ip => {
        console.log(`🌐 Network:  http://${ip}:${port}`)
      })
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📱 Share the network URL with devices on your LAN')
      console.log('🔧 Press Ctrl+C to stop the server')
      console.log('')
    })

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down Hub server...')
      server.close(() => {
        console.log('✅ Server closed')
        process.exit(0)
      })
    })

    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down Hub server...')
      server.close(() => {
        console.log('✅ Server closed')
        process.exit(0)
      })
    })

  } catch (err) {
    console.error('Failed to start server:', err)
    process.exit(1)
  }
}

startServer()