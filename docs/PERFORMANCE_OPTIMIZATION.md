# Performance Optimization Guide

This document outlines performance optimizations implemented in Hub and recommendations for further improvements.

## Current Optimizations

### 1. Bundle Size Optimization

#### Code Splitting
```typescript
// Dynamic imports for heavy components
const EmojiPicker = dynamic(() => import('emoji-picker-react'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})
```

#### Tree Shaking
- Using ES6 imports for better tree shaking
- Importing only needed icons from lucide-react
- Avoiding default exports where possible

### 2. React Performance

#### Memoization
```typescript
// Memoize expensive computations
const sortedUsers = useMemo(() => {
  return users.sort((a, b) => a.displayName.localeCompare(b.displayName))
}, [users])

// Memoize callbacks
const handleUserClick = useCallback((userId: string) => {
  setSelectedUser(userId)
}, [])
```

#### Component Optimization
```typescript
// Use React.memo for components that don't need frequent re-renders
export const UserListItem = React.memo(({ user, onSelect }: Props) => {
  // Component logic
})
```

### 3. WebSocket Optimization

#### Message Batching
```typescript
// Batch multiple messages into single WebSocket frame
const messageBatch = []
messageBatch.push(message1, message2, message3)
ws.send(JSON.stringify(messageBatch))
```

#### Compression
```typescript
// Enable per-message deflate compression
const wss = new WebSocketServer({
  perMessageDeflate: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    }
  }
})
```

### 4. Message History Optimization

#### Virtual Scrolling
For long message lists, implement virtual scrolling:

```typescript
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <Message message={messages[index]} />
    </div>
  )}
</FixedSizeList>
```

#### Message Pagination
```typescript
// Load messages in chunks
const MESSAGES_PER_PAGE = 50
const [page, setPage] = useState(0)
const visibleMessages = messages.slice(0, (page + 1) * MESSAGES_PER_PAGE)
```

### 5. Image and Asset Optimization

#### Next.js Image Component
```typescript
import Image from 'next/image'

<Image
  src="/avatar.png"
  width={48}
  height={48}
  alt="User avatar"
  loading="lazy"
/>
```

#### SVG Optimization
- Use SVGO to optimize SVG files
- Inline small SVGs to reduce HTTP requests
- Use SVG sprites for repeated icons

### 6. Network Optimization

#### WebRTC Data Channels
For large file transfers, use WebRTC data channels instead of WebSocket:

```typescript
const dataChannel = peerConnection.createDataChannel('fileTransfer', {
  ordered: true,
  maxRetransmits: 3
})

// Send file in chunks
const CHUNK_SIZE = 16384 // 16KB
for (let i = 0; i < file.size; i += CHUNK_SIZE) {
  const chunk = file.slice(i, i + CHUNK_SIZE)
  dataChannel.send(await chunk.arrayBuffer())
}
```

#### Connection Pooling
Reuse WebSocket connections instead of creating new ones.

## Performance Metrics

### Target Metrics
- **First Contentful Paint (FCP)**: < 1.5s
- **Time to Interactive (TTI)**: < 3.0s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

### Measuring Performance

#### Lighthouse
```bash
# Run Lighthouse audit
npx lighthouse http://localhost:3000 --view
```

#### Web Vitals
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

#### Custom Metrics
```typescript
// Measure WebSocket connection time
const startTime = performance.now()
const ws = new WebSocket(url)
ws.onopen = () => {
  const connectionTime = performance.now() - startTime
  console.log(`WebSocket connected in ${connectionTime}ms`)
}

// Measure message delivery time
const sendTime = Date.now()
sendMessage({ ...message, sendTime })

// On receive
const deliveryTime = Date.now() - message.sendTime
console.log(`Message delivered in ${deliveryTime}ms`)
```

## Recommended Optimizations

### 1. Implement Service Worker
Cache static assets for faster subsequent loads:

```typescript
// public/sw.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('hub-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/icon-192x192.svg',
        '/icon-512x512.svg',
      ])
    })
  )
})
```

### 2. Lazy Load Components
```typescript
// Lazy load heavy components
const SettingsModal = lazy(() => import('./settings-modal'))
const EmojiPicker = lazy(() => import('emoji-picker-react'))

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <SettingsModal />
</Suspense>
```

### 3. Optimize Re-renders
```typescript
// Use React DevTools Profiler to identify unnecessary re-renders
// Wrap expensive components with React.memo
export const ChatMessage = React.memo(({ message }: Props) => {
  return <div>{message.content}</div>
}, (prevProps, nextProps) => {
  // Custom comparison function
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content
})
```

### 4. Database Indexing (Future)
When adding persistent storage:

```sql
-- Index frequently queried fields
CREATE INDEX idx_messages_session ON messages(session_id, timestamp DESC);
CREATE INDEX idx_users_status ON users(status, last_activity);
```

### 5. CDN for Static Assets
Serve static assets from a CDN in production:

```typescript
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.example.com' 
    : '',
}
```

## Memory Management

### 1. Cleanup Event Listeners
```typescript
useEffect(() => {
  const handler = () => { /* ... */ }
  window.addEventListener('resize', handler)
  
  return () => {
    window.removeEventListener('resize', handler)
  }
}, [])
```

### 2. Clear Timers
```typescript
useEffect(() => {
  const timer = setInterval(() => { /* ... */ }, 1000)
  
  return () => {
    clearInterval(timer)
  }
}, [])
```

### 3. Limit Message History
```typescript
// Keep only last N messages in memory
const MAX_MESSAGES = 100
const messages = allMessages.slice(-MAX_MESSAGES)
```

### 4. Debounce Expensive Operations
```typescript
import { debounce } from 'lodash'

const debouncedSearch = debounce((query: string) => {
  // Expensive search operation
}, 300)
```

## Server-Side Optimization

### 1. Connection Limits
```typescript
const MAX_CONNECTIONS = 100
let connectionCount = 0

wss.on('connection', (ws) => {
  if (connectionCount >= MAX_CONNECTIONS) {
    ws.close(1008, 'Server full')
    return
  }
  connectionCount++
})
```

### 2. Message Rate Limiting
Already implemented in `src/lib/rate-limiter.ts`

### 3. Memory Monitoring
```typescript
setInterval(() => {
  const usage = process.memoryUsage()
  console.log({
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
  })
}, 60000) // Every minute
```

### 4. Clustering
Use Node.js clustering for multi-core systems:

```typescript
import cluster from 'cluster'
import { cpus } from 'os'

if (cluster.isPrimary) {
  const numCPUs = cpus().length
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }
} else {
  startServer()
}
```

## Monitoring and Profiling

### 1. Performance Monitoring
```typescript
// Add performance marks
performance.mark('message-send-start')
sendMessage(message)
performance.mark('message-send-end')

performance.measure('message-send', 'message-send-start', 'message-send-end')
const measure = performance.getEntriesByName('message-send')[0]
console.log(`Message send took ${measure.duration}ms`)
```

### 2. Error Tracking
Integrate with Sentry or similar:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

### 3. Analytics
Track key metrics:

```typescript
// Track user actions
analytics.track('message_sent', {
  messageLength: message.content.length,
  deliveryTime: deliveryTime,
})

analytics.track('call_started', {
  duration: callDuration,
  quality: callQuality,
})
```

## Testing Performance

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery quick --count 50 --num 100 ws://localhost:3000/ws
```

### Stress Testing
```typescript
// Simulate multiple users
const users = []
for (let i = 0; i < 100; i++) {
  const ws = new WebSocket('ws://localhost:3000/ws')
  users.push(ws)
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'join',
      displayName: `User${i}`
    }))
  }
}
```

## Checklist

- [ ] Enable compression for WebSocket messages
- [ ] Implement virtual scrolling for long message lists
- [ ] Add service worker for offline support
- [ ] Lazy load heavy components (emoji picker, settings)
- [ ] Optimize bundle size (analyze with webpack-bundle-analyzer)
- [ ] Add performance monitoring
- [ ] Implement message pagination
- [ ] Use React.memo for expensive components
- [ ] Add database indexing (when implemented)
- [ ] Set up CDN for static assets
- [ ] Implement clustering for production
- [ ] Add load testing to CI/CD pipeline

## Resources

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Performance](https://react.dev/learn/render-and-commit)
- [WebSocket Performance](https://www.ably.io/topic/websockets-performance)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
