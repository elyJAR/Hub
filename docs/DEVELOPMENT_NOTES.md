# Development Notes

## Custom Server & Hot Module Replacement (HMR)

### The Issue

This project uses a **custom Node.js server** (`server.ts`) to handle both:
1. Next.js application requests
2. WebSocket connections for real-time communication (`/ws`)

When using a custom server with Next.js, the default WebSocket-based HMR (Hot Module Replacement) doesn't work properly because:
- Our custom server intercepts all WebSocket upgrade requests
- Next.js expects to handle `/_next/webpack-hmr` WebSocket connections
- We can't easily delegate the upgrade to Next.js's internal server

### The Solution

We've configured Next.js to use **file polling** instead of WebSocket for HMR:

```javascript
// next.config.js
webpack: (config, { dev, isServer }) => {
  if (dev && !isServer) {
    config.watchOptions = {
      poll: 1000, // Check for changes every second
      aggregateTimeout: 300,
    }
  }
  return config
}
```

### What This Means

✅ **Hot reload still works** - Your changes will be reflected in the browser
✅ **WebSocket for app works** - The `/ws` endpoint for chat/communication is unaffected
⚠️ **Slightly slower** - Polling checks every 1 second vs instant WebSocket notification
⚠️ **Console warning** - You may see "WebSocket connection failed" in browser console (this is expected and harmless)

### Performance Impact

- **Development**: Minimal impact. Changes detected within 1 second.
- **Production**: No impact. HMR is not used in production builds.

### Alternative Solutions

If you need faster HMR, you have these options:

#### Option 1: Separate Ports (Recommended for Development)
Run Next.js dev server and WebSocket server on different ports:
- Next.js on port 3000 (with HMR WebSocket)
- WebSocket server on port 3001
- Use proxy or CORS to connect them

#### Option 2: Use Next.js API Routes
Move WebSocket handling to Next.js API routes (requires Next.js 13.4+ with App Router):
- Use Route Handlers with WebSocket support
- Eliminates need for custom server

#### Option 3: Accept the Polling
Keep current setup - polling works fine for most development workflows.

## WebSocket Architecture

### Custom WebSocket Server (`/ws`)

Our application uses a dedicated WebSocket endpoint for:
- User presence/session management
- Real-time chat messages
- Connection requests between users
- WebRTC signaling for peer-to-peer connections
- File transfer coordination

**Endpoint**: `ws://localhost:3000/ws`

**Message Types**:
- `join` - User joins with display name
- `connection-request` - Request to connect with another user
- `connection-response` - Accept/reject connection
- `chat-message` - Send message to connected user
- `typing-indicator` - Show typing status
- `webrtc-offer/answer/ice-candidate` - WebRTC signaling

See `src/types/messages.ts` for full message schema.

### Why Not Use Next.js Built-in WebSocket?

Next.js doesn't have built-in WebSocket support for custom application logic. The `/_next/webpack-hmr` WebSocket is only for development HMR, not for application features.

For production-grade WebSocket features, a custom server is the standard approach.

## Development Workflow

### Starting the Server

```bash
npm run dev
```

This starts the custom server with:
- Next.js app on `http://localhost:3000`
- WebSocket server on `ws://localhost:3000/ws`
- File polling for HMR

### Testing WebSocket

1. Open browser console
2. Navigate to `http://localhost:3000`
3. Join with a display name
4. Check Network tab for WebSocket connection to `/ws`
5. Open another tab/window to test multi-user features

### Ignoring Console Warnings

You can safely ignore:
- `WebSocket connection to 'ws://localhost:3000/_next/webpack-hmr' failed`

This is expected with our custom server setup.

## Production Deployment

In production:
- No HMR (not needed)
- No polling overhead
- Only custom WebSocket (`/ws`) is active
- Full performance, no compromises

Run production build:
```bash
npm run build
npm start
```

## Questions?

If you have questions about the custom server setup or WebSocket architecture, see:
- `server.ts` - Custom server implementation
- `src/lib/websocket-handler.ts` - WebSocket message handling
- `docs/TECHNICAL_SPEC.md` - Full technical specification
