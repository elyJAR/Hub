# Hub

A zero-install, browser-based communication platform for local networks. Connect, chat, call, and share files with anyone on your LAN or WiFi — no internet required.

## ✨ Features

- **Zero Installation**: Works entirely in web browsers
- **Local Network Only**: No internet connection required
- **Real-time Messaging**: Instant text chat with typing indicators
- **Voice Calls**: WebRTC-powered voice communication
- **File Sharing**: Secure file transfer with explicit consent
- **Cross-Platform**: Works on desktop and mobile browsers
- **Privacy-First**: No data persistence, no accounts, no tracking

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Server displays local network address:
# ✓ Hub running at http://192.168.1.42:3000
# ✓ Share this URL with devices on your network
```

Open the displayed URL in any browser on your network to join.

## 📱 How It Works

1. **Start Server**: Run Hub on any device in your network
2. **Join Network**: Others open the URL in their browsers
3. **Connect**: Send connection requests to start communicating
4. **Communicate**: Chat, call, and share files securely

## 🏗️ Architecture

- **Frontend**: Next.js 14 + React + TypeScript
- **Backend**: Custom Next.js server + WebSocket
- **Real-time**: WebSocket for messaging, WebRTC for calls/files
- **Security**: JWT sessions, explicit consent for all actions

## 📖 Documentation

- [User Flows](docs/USER_FLOWS.md) - Complete user interaction flows
- [Technical Specification](docs/TECHNICAL_SPEC.md) - Architecture and implementation details
- [API Reference](docs/API_REFERENCE.md) - WebSocket and HTTP API documentation
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md) - Production deployment instructions

## 🎯 Use Cases

- **Office Communication**: Internal messaging without internet
- **Campus Networks**: Student collaboration in dorms/labs
- **Events & Conferences**: Attendee networking and coordination
- **Emergency Communication**: Backup communication when internet is down
- **Private Meetings**: Secure communication in sensitive environments

## 🔧 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🐳 Docker Deployment

```bash
# Build image
docker build -t hub .

# Run container
docker run -p 3000:3000 hub

# Or use docker-compose
docker-compose up
```

## ⚙️ Configuration

### Environment Variables

```bash
NODE_ENV=production          # Environment mode
PORT=3000                   # Server port
MAX_USERS=100              # Maximum concurrent users
MAX_FILE_SIZE=104857600    # 100MB file size limit
ADMIN_PASSWORD=secret      # Admin dashboard password
```

### Feature Toggles

```bash
ENABLE_FILE_TRANSFER=true  # Enable file sharing
ENABLE_VOICE_CALLS=true   # Enable voice calls
ENABLE_GROUPS=false       # Enable group features (future)
```

## 🔒 Security

- **Transport Security**: HTTPS/WSS in production
- **Session Security**: JWT tokens with server-generated secrets
- **Explicit Consent**: All communication requires user approval
- **Rate Limiting**: Per-session message and action limits
- **No Persistence**: All data cleared on server restart

## 🌐 Browser Support

| Browser | Version | Features |
|---------|---------|----------|
| Chrome | 90+ | Full support |
| Safari | 14+ | Full support |
| Firefox | 88+ | Full support |
| Edge | 90+ | Full support |

## 📊 Performance

- **Latency**: < 100ms message delivery on LAN
- **Capacity**: 50+ concurrent users tested
- **File Transfer**: Up to 100MB files via WebRTC
- **Memory**: < 100MB server RAM usage

## 🛣️ Roadmap

### Phase 1 (MVP) ✅
- [x] User discovery and connection requests
- [x] Real-time text messaging
- [x] Basic file transfer
- [x] Responsive web interface

### Phase 2 (Current)
- [ ] Voice calls via WebRTC
- [ ] Enhanced file transfer with resume
- [ ] Improved mobile experience
- [ ] Admin dashboard

### Phase 3 (Future)
- [ ] Group messaging and calls
- [ ] Screen sharing
- [ ] End-to-end encryption
- [ ] Persistent user identity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/hub/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/hub/discussions)
- **Documentation**: [docs/](docs/) folder

## 🙏 Acknowledgments

- WebRTC community for peer-to-peer communication standards
- Next.js team for the excellent full-stack framework
- Contributors and testers who help improve Hub

---

**Hub** - Bringing people together, one network at a time. 🌐