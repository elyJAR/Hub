# Debugging Guide - Persistent Connections & Notifications

## 🔍 What Was Fixed

### Issue 1: Connection Requests Missing ID
**Problem**: Connection requests didn't include an `id` field, causing server errors.

**Fix**: Added unique request ID generation:
```typescript
const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
sendMessage({
  type: 'connection-request',
  targetSessionId: targetUserId,
  id: requestId,
})
```

### Issue 2: Missing Event Listeners
**Problem**: WebSocket hook wasn't emitting all necessary events.

**Fix**: Added missing event listeners in `use-websocket.ts`:
- `connection-rejected`
- `file-transfer-response`
- `file-transfer-data`
- `chat-message-edited`
- `chat-message-edited-confirm`
- `chat-message-deleted`
- `chat-message-deleted-confirm`
- `webrtc-call-declined`
- `webrtc-call-ended`

### Issue 3: Connection Persistence Logic
**Problem**: Storing sessionIds which change on refresh, but need to store displayNames.

**Fix**: Updated storage logic to:
1. **Save**: Convert sessionIds → displayNames before storing
2. **Load**: Convert displayNames → sessionIds after loading

```typescript
// Save (sessionIds → displayNames)
const displayNames = Array.from(connections)
  .map(sessionId => allUsers.find(u => u.sessionId === sessionId)?.displayName)
  .filter(Boolean)
localStorage.setItem(`hub-connections-${displayName}`, JSON.stringify(displayNames))

// Load (displayNames → sessionIds)
const parsed = JSON.parse(savedConnections) // displayNames
const sessionIds = new Set()
parsed.forEach(displayName => {
  const user = allUsers.find(u => u.displayName === displayName)
  if (user) sessionIds.add(user.sessionId)
})
setConnections(sessionIds)
```

---

## 🧪 Testing Steps

### Step 1: Start the Server
```bash
npm run dev
```

Wait for: `✓ Ready on http://localhost:3000`

### Step 2: Open Browser Console
1. Open http://localhost:3000
2. Press `F12` (Developer Tools)
3. Go to **Console** tab
4. Keep it open for all tests

### Step 3: Join as First User
1. Enter name: "Alice"
2. Click "Join Hub"
3. **Check Console** - Should see:
   ```
   [UserList] Setting up event listeners
   [UserList] Loaded saved connection displayNames: []
   ```

### Step 4: Open Second Window
1. Open http://localhost:3000 in **Incognito/Private** mode
2. Press `F12` and open Console
3. Join as "Bob"

### Step 5: Send Connection Request
**In Alice's window:**
1. You should see Bob in the user list
2. Click "Send Connection Request" button
3. **Immediately check:**
   - ✅ Button changes to gray with spinner
   - ✅ Button text: "⟳ Waiting for response..."
   - ✅ Blue toast appears: "📘 Connection request sent"
   - ✅ Console shows:
     ```
     [UserList] Sending connection request to: bob-session-id-123
     [UserList] Showing success toast
     ```

### Step 6: Accept Connection
**In Bob's window:**
1. You should see a connection request modal
2. Click "Accept"
3. **Check:**
   - ✅ Green toast: "✓ Connected with Alice"
   - ✅ Console:
     ```
     [UserList] Connection established: {sessionId: "alice-session-id", displayName: "Alice"}
     ```

**In Alice's window:**
1. **Check:**
   - ✅ Green toast: "✓ Connected with Bob"
   - ✅ Loading state disappears
   - ✅ Shows "Message" and "📞 Call" buttons
   - ✅ Console:
     ```
     [UserList] Connection established: {sessionId: "bob-session-id", displayName: "Bob"}
     [UserList] Saving connection displayNames: ["Bob"]
     [UserList] Mapped Bob -> bob-session-id-123
     ```

### Step 7: Test Persistence
**In Alice's window:**
1. Press `F5` to refresh the page
2. Join as "Alice" again
3. **Check:**
   - ✅ Console:
     ```
     [UserList] Loaded saved connection displayNames: ["Bob"]
     [UserList] Mapped Bob -> bob-session-id-456  (new session ID!)
     ```
   - ✅ Bob shows as "Connected" (green dot)
   - ✅ "Message" and "📞 Call" buttons visible
   - ✅ NO "Send Connection Request" button

### Step 8: Verify localStorage
**In Alice's window:**
1. Press `F12`
2. Go to **Application** tab
3. Expand **Local Storage** → `http://localhost:3000`
4. Look for key: `hub-connections-Alice`
5. **Check value:**
   ```json
   ["Bob"]
   ```
   (Note: It's displayName, NOT sessionId!)

---

## 🐛 Troubleshooting

### Problem: No console logs appear

**Diagnosis:**
```bash
# Check if files are saved
git status

# Restart dev server
# Press Ctrl+C
npm run dev

# Hard refresh browser
# Press Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

### Problem: Toasts don't appear

**Test toast system directly:**
1. Open browser console
2. Type:
   ```javascript
   // Test if toast module loads
   const toastModule = await import('/src/lib/toast.ts')
   console.log('Toast module:', toastModule)
   
   // Test toast
   toastModule.toast.success('Test message')
   ```

**Expected:**
- Green toast appears in bottom-right corner
- Toast disappears after 3 seconds

**If toast doesn't appear:**
1. Check console for errors
2. Verify `src/lib/toast.ts` exists
3. Check that animations are in `src/app/globals.css`

### Problem: Loading state doesn't show

**Check in console:**
```
Should see: [UserList] Sending connection request to: abc123
```

**If you see the log but button doesn't change:**
1. Check that `Loader2` icon is imported from `lucide-react`
2. Check that `pendingRequests` state is updating:
   ```typescript
   // Add temporary debug log in user-list.tsx:
   console.log('Pending requests:', Array.from(pendingRequests))
   console.log('Is pending?', isRequestPending(user.sessionId))
   ```

### Problem: Connections don't persist

**Check localStorage:**
1. F12 → Application → Local Storage
2. Look for `hub-connections-Alice`
3. **If missing:**
   - Check console for save logs
   - Verify connections.size > 0
4. **If present but not loading:**
   - Check console for load logs
   - Verify displayName mapping is working

**Debug the mapping:**
```typescript
// Add to user-list.tsx temporarily:
useEffect(() => {
  console.log('All users:', allUsers.map(u => ({ id: u.sessionId, name: u.displayName })))
  console.log('Current connections (sessionIds):', Array.from(connections))
}, [allUsers, connections])
```

### Problem: "Connection request sent" toast appears but no loading state

**This means:**
- Toast system is working ✅
- Event listener is working ✅
- State update is NOT working ❌

**Fix:**
Check that `setPendingRequests` is called BEFORE `toast.info()`:
```typescript
// Correct order:
setPendingRequests(prev => new Set([...prev, targetUserId]))  // First
toast.info('Connection request sent')  // Second
sendMessage(...)  // Third
```

### Problem: Connection persists but shows "Send Connection Request" button

**This means:**
- localStorage is working ✅
- Loading is working ✅
- Mapping is NOT working ❌

**Debug:**
```typescript
// Check if displayName → sessionId mapping is correct
console.log('Saved displayNames:', JSON.parse(localStorage.getItem('hub-connections-Alice')))
console.log('Current users:', allUsers.map(u => u.displayName))
console.log('Mapped sessionIds:', Array.from(connections))
```

**Common cause:**
- User rejoined with different displayName
- User list not loaded yet when mapping happens

**Fix:**
Make sure `allUsers` is populated before mapping:
```typescript
useEffect(() => {
  if (allUsers.length === 0) return  // Wait for users to load
  
  // Then do the mapping...
}, [currentSession.displayName, allUsers])
```

---

## ✅ Success Criteria

All features work if you see:

### 1. Console Logs
- ✅ `[UserList] Setting up event listeners`
- ✅ `[UserList] Loaded saved connection displayNames: [...]`
- ✅ `[UserList] Sending connection request to: ...`
- ✅ `[UserList] Connection established: {...}`
- ✅ `[UserList] Saving connection displayNames: [...]`
- ✅ `[UserList] Mapped DisplayName -> sessionId`

### 2. Toast Notifications
- ✅ Blue: "📘 Connection request sent"
- ✅ Green: "✓ Connected with [User]"
- ✅ Red: "✕ [User] declined your request" (if declined)

### 3. Loading States
- ✅ Spinner icon visible
- ✅ "⟳ Waiting for response..." text
- ✅ Button is gray and disabled

### 4. Persistent Connections
- ✅ Refresh page → Still connected
- ✅ Close browser → Reopen → Still connected
- ✅ localStorage has displayNames (not sessionIds)
- ✅ DisplayNames correctly mapped to new sessionIds

---

## 📊 Expected Flow

### First Connection
```
Alice                           Server                          Bob
  |                               |                              |
  |--[connection-request]-------->|                              |
  |   (with id: req-123)          |                              |
  |                               |--[incoming-connection-req]-->|
  |<--[request-sent]--------------|                              |
  |                               |                              |
  | 🔵 Toast: "Request sent"      |                              |
  | ⏳ Loading state shown         |                              |
  |                               |                              |
  |                               |<--[connection-response]------|
  |                               |   (accepted: true)           |
  |<--[connection-established]----|                              |
  |                               |--[connection-established]--->|
  |                               |                              |
  | 🟢 Toast: "Connected"         |                              | 🟢 Toast: "Connected"
  | 💾 Save: ["Bob"]              |                              | 💾 Save: ["Alice"]
```

### After Refresh
```
Alice (refreshed)               Server                          Bob
  |                               |                              |
  | 📂 Load: ["Bob"]              |                              |
  | 🔍 Find Bob in users          |                              |
  | ✅ Map "Bob" -> new sessionId |                              |
  | ✅ Show as connected          |                              |
  |                               |                              |
  | (No request needed!)          |                              |
```

---

## 🔧 Manual Verification Checklist

Before reporting issues, verify:

- [ ] Server is running (`npm run dev`)
- [ ] No errors in server console
- [ ] No errors in browser console
- [ ] Browser cache cleared (Ctrl+Shift+Delete)
- [ ] localStorage cleared (if testing fresh)
- [ ] Using two different browser windows/tabs
- [ ] Both users have different displayNames
- [ ] WebSocket connection is established (check Network tab → WS)
- [ ] All files are saved
- [ ] Dev server was restarted after changes

---

## 🆘 Still Not Working?

### Share These Details:

1. **Browser Console Output** (screenshot or copy/paste)
   - Include all `[UserList]` logs
   - Include any errors (red text)

2. **localStorage Contents**
   - F12 → Application → Local Storage
   - Screenshot of all `hub-*` keys and values

3. **Network Tab**
   - F12 → Network → WS (WebSocket)
   - Check if WebSocket is connected
   - Screenshot of WebSocket messages

4. **Server Console Output**
   - Any errors or warnings
   - Connection logs

5. **Steps to Reproduce**
   - Exact steps you followed
   - What you expected vs what happened

---

## 💡 Pro Tips

1. **Always keep console open** when testing
2. **Use incognito** for second user (clean state)
3. **Check console logs** before reporting issues
4. **Clear localStorage** if things get weird:
   ```javascript
   localStorage.clear()
   location.reload()
   ```
5. **Restart server** after code changes
6. **Hard refresh** browser (Ctrl+Shift+R)

---

## 🎯 Quick Test Script

```bash
# Terminal 1: Start server
npm run dev

# Browser 1: Alice
# 1. Open http://localhost:3000
# 2. F12 → Console
# 3. Join as "Alice"
# 4. Check console for: [UserList] Setting up event listeners

# Browser 2: Bob (Incognito)
# 1. Open http://localhost:3000 (incognito)
# 2. F12 → Console
# 3. Join as "Bob"

# Browser 1: Alice
# 1. Click "Send Connection Request" for Bob
# 2. Check: Loading state + Blue toast + Console logs

# Browser 2: Bob
# 1. Click "Accept" on connection request
# 2. Check: Green toast + Console logs

# Browser 1: Alice
# 1. Check: Green toast + "Connected" status + Console logs
# 2. F5 to refresh
# 3. Join as "Alice" again
# 4. Check: Bob still shows as "Connected" (no request needed!)

# If ALL of these work → SUCCESS! 🎉
```

---

**Last Updated**: After fixing connection request ID, event listeners, and persistence logic.
