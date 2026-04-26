# Hub User Flows

## 1. Initial Setup & Join Flow

### Server Operator Flow
1. **Server Setup**
   - Operator runs `npm run dev` or `npm start`
   - Server displays local IP address (e.g., `http://192.168.1.42:3000`)
   - Operator shares this URL with network participants

### User Join Flow
1. **Access Application**
   - User opens shared URL in browser
   - Application loads with splash screen

2. **Identity Setup**
   - User sees "Join Hub" screen
   - Required: Enter display name (3-20 characters)
   - Optional: Select avatar (color + emoji/icon)
   - Click "Join Network" button

3. **Validation & Entry**
   - System validates name uniqueness
   - If name taken, suggest alternatives (e.g., "Alice #4f2a")
   - On success, user enters main interface
   - Welcome animation plays
   - User appears in everyone's user list

## 2. User Discovery & Connection

### Viewing Available Users
1. **User List Display**
   - Left sidebar shows all online users
   - Each user shows: name, avatar, status indicator
   - Status types: 🟢 Online, 🟡 Away, 🔴 In Call, ⚫ Offline

2. **User Information**
   - Hover over user shows join time
   - Click user shows connection options
   - Visual indicators for existing connections

### Connection Request Flow
1. **Initiating Connection**
   - User A clicks on User B in the list
   - Modal appears: "Connect with [User B]?"
   - Options: "Send Request" or "Cancel"

2. **Request Transmission**
   - User A clicks "Send Request"
   - System sends connection request to User B
   - User A sees "Request sent..." status
   - 30-second timeout starts

3. **Request Reception**
   - User B receives notification toast
   - Toast shows: "[User A] wants to connect"
   - Options: "Accept" or "Decline"
   - Auto-decline after 30 seconds if no response

4. **Response Handling**
   - **If Accepted**: Both users become "connected"
   - **If Declined**: User A gets "Request declined" notification
   - **If Timeout**: User A gets "Request timed out" notification

## 3. Messaging Flow

### Starting a Conversation
1. **Opening Chat**
   - User clicks on connected user in list
   - Chat interface opens in main area
   - Chat header shows user name and status

2. **Sending Messages**
   - User types in message input field
   - Other user sees typing indicator
   - Press Enter or click Send button
   - Message appears with timestamp

3. **Message States**
   - **Sending**: Gray checkmark
   - **Delivered**: Blue checkmark
   - **Failed**: Red X with retry option

### Real-time Features
1. **Typing Indicators**
   - Shows when other user is typing
   - Displays as "User is typing..." below last message
   - Disappears after 3 seconds of inactivity

2. **Message Delivery**
   - Messages appear instantly for sender
   - Real-time delivery to recipient
   - Delivery confirmation back to sender

## 4. File Transfer Flow

### Initiating File Transfer
1. **File Selection**
   - User clicks attachment button in chat
   - File picker opens
   - User selects file (size limit: 100MB)

2. **Transfer Request**
   - System shows file preview: name, size, type
   - User clicks "Send File"
   - Request sent to recipient

### Recipient Experience
1. **File Request Notification**
   - Recipient sees file transfer request
   - Shows: filename, size, sender name
   - Options: "Accept" or "Decline"

2. **Transfer Process**
   - **If Accepted**: Transfer begins immediately
   - Progress bar shows for both users
   - Transfer uses WebRTC data channel for large files
   - Option to cancel during transfer

3. **Transfer Completion**
   - Success notification for both users
   - File available for download on recipient side
   - Transfer history maintained in chat

## 5. Voice Call Flow

### Initiating Call
1. **Call Request**
   - User clicks call button next to connected user
   - System requests microphone permission
   - Call request sent to recipient

2. **Call Reception**
   - Recipient gets incoming call notification
   - Shows caller name and avatar
   - Options: "Accept" or "Decline"
   - Ringtone plays (if enabled)

### Active Call
1. **Call Setup**
   - WebRTC connection established
   - Both users see call interface
   - Mute/unmute controls available

2. **Call Management**
   - Call timer displays duration
   - Audio quality indicator
   - End call button for either user

3. **Call Termination**
   - Either user can end call
   - Call duration summary shown
   - Return to normal chat interface

## 6. Group Features (Future)

### Group Creation
1. **Creating Group**
   - User clicks "Create Group" button
   - Enters group name and description
   - Selects initial members from connected users

2. **Group Invitations**
   - Invites sent to selected users
   - Each user must accept individually
   - Group appears in sidebar once accepted

### Group Communication
1. **Group Chat**
   - Similar to direct messages
   - Shows all member names in header
   - Message attribution shows sender name

2. **Group Calls**
   - Supports up to 8 participants
   - Uses SFU (Selective Forwarding Unit) architecture
   - Individual mute controls for each participant

## 7. Error Scenarios & Recovery

### Connection Issues
1. **Network Disconnection**
   - User sees "Reconnecting..." indicator
   - Automatic reconnection attempts
   - Message queue maintained during disconnection

2. **Server Restart**
   - All users disconnected
   - Users must rejoin manually
   - No message history preserved

### Permission Denials
1. **Microphone Access Denied**
   - Clear error message displayed
   - Instructions to enable in browser settings
   - Fallback to text-only communication

2. **File Access Issues**
   - Error messages for file size limits
   - Unsupported file type warnings
   - Storage space notifications

## 8. Administrative Actions

### Server Management
1. **User Monitoring**
   - Admin can view all active sessions
   - See connection counts and activity
   - Monitor server resource usage

2. **Moderation Actions**
   - Kick disruptive users
   - Set room password
   - Enable/disable features

### Session Management
1. **Cleanup Procedures**
   - Automatic cleanup of inactive sessions
   - Message history expiration
   - Resource monitoring and alerts