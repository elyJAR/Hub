# Hub Deployment Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Network access between server and client devices
- Modern web browsers on client devices

### 1-Minute Setup
```bash
# Clone and install
git clone <repository-url>
cd hub
npm install

# Start development server
npm run dev

# Server will display:
# ✓ Hub server running at http://192.168.1.42:3000
# ✓ Share this URL with devices on your network
```

## Production Deployment

### Method 1: Direct Node.js
```bash
# Build the application
npm run build

# Start production server
npm start

# Or with custom configuration
PORT=8080 MAX_USERS=100 npm start
```

### Method 2: Docker
```bash
# Build Docker image
docker build -t hub .

# Run container
docker run -p 3000:3000 hub

# Or with environment variables
docker run -p 3000:3000 \
  -e MAX_USERS=100 \
  -e ADMIN_PASSWORD=secure123 \
  hub
```

### Method 3: Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  hub:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MAX_USERS=100
      - ADMIN_PASSWORD=secure123
    restart: unless-stopped
```

## Network Configuration

### Finding Your Server IP
The server automatically detects and displays the local IP address:
```
✓ LocalLink server running at:
  - Local:   http://localhost:3000
  - Network: http://192.168.1.42:3000
  - WiFi:    http://10.0.0.15:3000
```

### Firewall Configuration
Ensure the server port is accessible:
```bash
# Linux (ufw)
sudo ufw allow 3000

# Windows Firewall
# Add inbound rule for port 3000

# macOS
# System Preferences > Security & Privacy > Firewall > Options
# Add LocalLink application
```

### Router Configuration (if needed)
For access across network segments:
- Enable port forwarding for port 3000
- Configure DMZ for server device (less secure)
- Use VPN for remote access

## Environment Configuration

### Environment Variables
```bash
# Server Configuration
NODE_ENV=production          # production | development
PORT=3000                   # Server port
HOST=0.0.0.0               # Bind address

# Feature Limits
MAX_USERS=100              # Maximum concurrent users
MAX_FILE_SIZE=104857600    # 100MB in bytes
MESSAGE_RATE_LIMIT=60      # Messages per minute per user

# Security
JWT_SECRET=auto            # Auto-generate or provide custom
ADMIN_PASSWORD=            # Admin dashboard password
SESSION_TIMEOUT=300000     # 5 minutes in milliseconds

# WebRTC Configuration
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=               # Optional TURN server
TURN_USERNAME=             # TURN credentials
TURN_PASSWORD=

# Logging
LOG_LEVEL=info             # error | warn | info | debug
LOG_FILE=                  # Optional log file path
```

### Configuration File (Optional)
```json
// config/production.json
{
  "server": {
    "port": 3000,
    "maxUsers": 100,
    "sessionTimeout": 300000
  },
  "features": {
    "fileTransfer": true,
    "voiceCalls": true,
    "maxFileSize": 104857600
  },
  "security": {
    "rateLimiting": true,
    "adminPassword": "secure123"
  },
  "webrtc": {
    "iceServers": [
      { "urls": "stun:stun.l.google.com:19302" }
    ]
  }
}
```

## SSL/HTTPS Setup

### Self-Signed Certificate (Development)
```bash
# Generate certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Start with HTTPS
HTTPS=true SSL_KEY=key.pem SSL_CERT=cert.pem npm start
```

### Let's Encrypt (Public Domain)
```bash
# Install certbot
sudo apt install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Use certificate
SSL_KEY=/etc/letsencrypt/live/yourdomain.com/privkey.pem \
SSL_CERT=/etc/letsencrypt/live/yourdomain.com/fullchain.pem \
npm start
```

### mkcert (Local Development)
```bash
# Install mkcert
brew install mkcert  # macOS
# or download from GitHub releases

# Create local CA
mkcert -install

# Generate certificate for local IP
mkcert 192.168.1.42 localhost

# Start with local certificate
SSL_KEY=192.168.1.42-key.pem SSL_CERT=192.168.1.42.pem npm start
```

## Performance Tuning

### Server Optimization
```bash
# Increase Node.js memory limit
node --max-old-space-size=2048 server.js

# Enable clustering (multiple CPU cores)
CLUSTER_WORKERS=4 npm start

# Optimize garbage collection
node --optimize-for-size server.js
```

### Network Optimization
```javascript
// In server configuration
const wsOptions = {
  perMessageDeflate: true,    // Compress messages
  maxPayload: 1024 * 1024,   // 1MB max message size
  clientTracking: true,       // Track connections
  maxConnections: 100         // Connection limit
}
```

### Database Optimization (Future)
```javascript
// Redis for session storage (optional)
const redis = require('redis')
const client = redis.createClient({
  host: 'localhost',
  port: 6379,
  db: 0
})
```

## Monitoring & Health Checks

### Health Check Endpoint
```bash
# Check server status
curl http://192.168.1.42:3000/api/health

# Response
{
  "status": "healthy",
  "activeUsers": 15,
  "uptime": 3600,
  "memoryUsage": 45.2,
  "version": "1.0.0"
}
```

### Process Monitoring
```bash
# Using PM2
npm install -g pm2
pm2 start ecosystem.config.js
pm2 monitor

# Using systemd (Linux)
sudo systemctl enable locallink
sudo systemctl start locallink
sudo systemctl status locallink
```

### Log Monitoring
```bash
# View logs
tail -f logs/locallink.log

# Log rotation
logrotate /etc/logrotate.d/locallink
```

## Backup & Recovery

### What to Backup
- Configuration files
- SSL certificates
- Custom branding assets
- Deployment scripts

### What NOT to Backup
- Session data (ephemeral)
- Message history (temporary)
- User accounts (none exist)

### Backup Script
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/locallink_$DATE"

mkdir -p $BACKUP_DIR
cp -r config/ $BACKUP_DIR/
cp -r certs/ $BACKUP_DIR/
cp package*.json $BACKUP_DIR/
cp docker-compose.yml $BACKUP_DIR/

tar -czf "locallink_backup_$DATE.tar.gz" $BACKUP_DIR
rm -rf $BACKUP_DIR
```

## Troubleshooting

### Common Issues

#### "Cannot connect to server"
- Check firewall settings
- Verify server is running: `curl http://localhost:3000/api/health`
- Check network connectivity: `ping 192.168.1.42`

#### "WebSocket connection failed"
- Ensure WebSocket port is open
- Check for proxy/firewall blocking WebSocket upgrades
- Try different browser

#### "WebRTC connection failed"
- Check STUN/TURN server configuration
- Verify UDP traffic is allowed
- Test with different network configuration

#### High memory usage
- Check for memory leaks: `node --inspect server.js`
- Reduce session timeout
- Implement session cleanup

### Debug Mode
```bash
# Enable debug logging
DEBUG=locallink:* npm start

# Or specific modules
DEBUG=locallink:websocket,locallink:webrtc npm start
```

### Performance Profiling
```bash
# CPU profiling
node --prof server.js
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect server.js
# Open chrome://inspect in Chrome
```

## Security Considerations

### Network Security
- Use HTTPS in production
- Implement rate limiting
- Monitor for suspicious activity
- Regular security updates

### Access Control
- Set strong admin password
- Limit server access to trusted networks
- Consider VPN for remote access
- Regular certificate rotation

### Data Privacy
- No persistent data storage
- Automatic session cleanup
- Encrypted WebRTC communications
- Clear privacy policy for users

## Scaling Considerations

### Horizontal Scaling
```yaml
# Load balancer configuration
version: '3.8'
services:
  nginx:
    image: nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
  
  locallink1:
    build: .
    environment:
      - NODE_ENV=production
  
  locallink2:
    build: .
    environment:
      - NODE_ENV=production
```

### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize Node.js settings
- Use clustering for multi-core systems
- Implement connection pooling

### Future Considerations
- Redis for shared session storage
- Database for persistent features
- CDN for static assets
- Message queuing for high throughput