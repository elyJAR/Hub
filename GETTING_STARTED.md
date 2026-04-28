# Getting Started with Hub

Welcome to Hub - a local network communication platform! This guide will help you get up and running quickly.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager
- Modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/elyJAR/Hub.git
   cd Hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open in your browser**
   The server will display the local network address:
   ```
   🚀 Hub Server Started
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📍 Local:    http://localhost:3000
   🌐 Network:  http://192.168.1.42:3000
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

5. **Share the network URL** with others on your LAN

## 📱 Using Hub

### First Time Setup

1. **Join the Network**
   - Open the Hub URL in your browser
   - Enter your display name (3-50 characters)
   - Choose an avatar from the available options
   - Click "Join Hub"

2. **Discover Users**
   - See all online users in the left sidebar
   - Users show their avatar, name, and online status

3. **Connect with Someone**
   - Click on a user in the sidebar
   - Click "Send Connection Request"
   - Wait for them to accept

4. **Start Chatting**
   - Once connected, click on the user to open chat
   - Type your message and press Enter
   - See typing indicators when they're typing
   - Messages show delivery status (✓ sent, ✓✓ delivered)

### Features

- **Real-time Messaging**: Instant text chat with connected users
- **Typing Indicators**: See when someone is typing
- **Connection Requests**: Explicit consent before communication
- **User Presence**: Live updates of who's online
- **Responsive Design**: Works on desktop and mobile browsers
- **No Installation**: Everything runs in the browser

## 🐳 Docker Deployment

### Using Docker

```bash
# Build the image
docker build -t hub .

# Run the container
docker run -p 3000:3000 hub
```

### Using Docker Compose

```bash
# Start the service
docker-compose up

# Or build and start
docker-compose up --build

# Run in background
docker-compose up -d
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key configuration options:

```env
# Server
PORT=3000                    # Server port
MAX_USERS=100               # Maximum concurrent users

# Security
SESSION_TIMEOUT=300000      # 5 minutes in milliseconds
MESSAGE_RATE_LIMIT=60       # Messages per minute per user

# Features
MAX_FILE_SIZE=104857600     # 100MB (for future file transfer)
```

## 🧪 Development

### Available Scripts

```bash
npm run dev              # Start development server
npm run build           # Build for production
npm start               # Start production server
npm run lint            # Run ESLint
npm run lint:fix        # Fix ESLint errors
npm run type-check      # Check TypeScript types
npm run format          # Format code with Prettier
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

### Project Structure

```
hub/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── api/            # API routes (health check)
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Main page
│   ├── components/          # React components
│   │   ├── avatar-picker.tsx
│   │   ├── chat-interface.tsx
│   │   ├── connection-request-modal.tsx
│   │   ├── error-screen.tsx
│   │   ├── join-screen.tsx
│   │   ├── loading-screen.tsx
│   │   ├── main-interface.tsx
│   │   └── user-list.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── use-connection-requests.ts
│   │   └── use-websocket.ts
│   ├── lib/                # Utility libraries
│   │   ├── network-utils.ts
│   │   ├── rate-limiter.ts
│   │   ├── session-manager.ts
│   │   └── websocket-handler.ts
│   └── types/              # TypeScript type definitions
│       └── messages.ts
├── docs/                   # Documentation
├── server.ts              # Custom Next.js server with WebSocket
└── package.json
```

## 🔧 Troubleshooting

### Common Issues

**"Cannot connect to server"**
- Check that the server is running
- Verify you're on the same network
- Check firewall settings
- Try accessing via `localhost:3000` first

**"WebSocket connection failed"**
- Ensure WebSocket port is not blocked
- Check browser console for errors
- Try a different browser

**"Name already taken"**
- Choose a different display name
- The system will suggest an alternative

### Getting Help

- Check the [documentation](docs/)
- Open an [issue](https://github.com/elyJAR/Hub/issues)
- Read the [contributing guide](CONTRIBUTING.md)

## 📚 Next Steps

- Read the [User Flows](docs/USER_FLOWS.md) for detailed usage scenarios
- Check the [Technical Specification](docs/TECHNICAL_SPEC.md) for architecture details
- Review the [API Reference](docs/API_REFERENCE.md) for WebSocket message formats
- See the [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) for production setup

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Hub** - Bringing people together, one network at a time. 🌐