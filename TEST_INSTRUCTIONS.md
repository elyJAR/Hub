# Test Instructions - Step by Step

## 🚀 Quick Start

### Step 1: Start the Server
```bash
npm run dev
```

Wait for: `✓ Ready on http://localhost:3000`

---

## 🧪 Test 1: Toast Notifications

### Open Browser Console First!
1. Open http://localhost:3000
2. Press `F12` to open Developer Tools
3. Go to **Console** tab
4. Keep it open for all tests

### Join as User
1. Enter name: "Alice"
2. Click "Join Hub"
3. **Check Console** - Should see:
   ```
   [UserList] Setting up event listeners
   [UserList] Loaded saved connections: []
   ```

### If you see these logs ✅ = System is working!

---

## 🧪 Test 2: Loading State & Toast

### Open Second Window
1. Open http://localhost:3000 in **Incognito/Private** mode
2. Press `F12` and open Console
3. Join as "Bob"

### Send Connection Request
**In Alice's window:**
1. You should see Bob in the user list
2. Click "Send Connection Request" button
3. **Immediately check:**
   - ✅ Button changes to gray with spinner
   - ✅ Button text: "⟳ Waiting for response..."
   - ✅ Blue toast appears: "Connection request sent"
   - ✅ Console shows: `[UserList] Sending connection request to: ...`

### If ALL of these happen ✅ = Loading state works!

---

## 🧪 Test 3: Connection & Toast

**In Bob's window:**
1. You should see a connection request notification
2. Click "Accept"
3. **Check:**
   - ✅ Green toast: "Connected with Alice"
   - ✅ Console: `[UserList] Connection established: ...`
   - ✅ Status changes to "Connected"

**In Alice's window:**
1. **Check:**
   - ✅ Green toast: "Connected with Bob"
   - ✅ Loading state disappears
   - ✅ Shows "Message" and "Call" buttons
   - ✅ Console: `[UserList] Saving connections: ["bob-session-id"]`

### If ALL toasts appear ✅ = Notifications work!

---

## 🧪 Test 4: Persistent Connections

**In Alice's window:**
1. Press `F5` to refresh the page
2. Join as "Alice" again
3. **Check:**
   - ✅ Console: `[UserList] Loaded saved connections: ["bob-session-id"]`
   - ✅ Bob shows as "Connected" (green dot)
   - ✅ "Message" and "Call" buttons visible
   - ✅ NO "Send Connection Request" button

### If connection persists ✅ = Persistence works!

---

## 🧪 Test 5: localStorage Verification

**In Alice's window:**
1. Press `F12`
2. Go to **Application** tab
3. Expand **Local Storage** → `http://localhost:3000`
4. Look for key: `hub-connections-Alice`
5. **Check value:**
   ```json
   ["abc123xyz"]  // Bob's session ID
   ```

### If you see this ✅ = Storage works!

---

## 🐛 Troubleshooting

### Problem: No console logs appear

**Solution:**
1. Make sure you saved all files
2. Restart the dev server (Ctrl+C, then `npm run dev`)
3. Hard refresh browser (Ctrl+Shift+R)

### Problem: Toasts don't appear

**Test toast directly:**
1. Open browser console
2. Type:
   ```javascript
   // Import toast
   const { toast } = await import('/src/lib/toast.ts')
   
   // Test it
   toast.success('Test message')
   ```
3. If toast appears → System works, check event listeners
4. If toast doesn't appear → Check console for errors

### Problem: Loading state doesn't show

**Check in console:**
```javascript
// Should see this when clicking button:
[UserList] Sending connection request to: abc123
```

If you see this but button doesn't change:
1. Check that `Loader2` icon is imported
2. Check that `pendingRequests` state is updating

### Problem: Connections don't persist

**Check localStorage:**
1. F12 → Application → Local Storage
2. Look for `hub-connections-Alice`
3. If missing → Check console for save logs
4. If present but not loading → Check load logs

---

## ✅ Success Criteria

All features work if:

1. **Console Logs Appear**
   - ✅ "Setting up event listeners"
   - ✅ "Loaded saved connections"
   - ✅ "Sending connection request"
   - ✅ "Connection established"
   - ✅ "Saving connections"

2. **Toasts Appear**
   - ✅ Blue: "Connection request sent"
   - ✅ Green: "Connected with [User]"
   - ✅ Red: "[User] declined your request" (if declined)

3. **Loading State Shows**
   - ✅ Spinner icon visible
   - ✅ "Waiting for response..." text
   - ✅ Button is gray and disabled

4. **Connections Persist**
   - ✅ Refresh page → Still connected
   - ✅ Close browser → Reopen → Still connected
   - ✅ localStorage has correct data

---

## 📸 What You Should See

### Before Sending Request:
```
┌─────────────────────────────┐
│ 😊 Bob                      │
│ Not connected               │
│ [Send Connection Request]   │  ← Blue button
└─────────────────────────────┘
```

### After Clicking (Immediately):
```
┌─────────────────────────────┐
│ 😊 Bob                      │
│ Request pending...          │  ← Status updated
│ [⟳ Waiting for response...] │  ← Gray, spinner
└─────────────────────────────┘

Toast: 📘 Connection request sent  ← Blue toast
```

### After Accepting:
```
┌─────────────────────────────┐
│ 😊 Bob                  ●   │  ← Green dot
│ Connected                   │
│ [Message] [📞 Call]         │  ← Action buttons
└─────────────────────────────┘

Toast: ✓ Connected with Bob  ← Green toast
```

### After Refresh:
```
┌─────────────────────────────┐
│ 😊 Bob                  ●   │  ← Still connected!
│ Connected                   │
│ [Message] [📞 Call]         │  ← Ready to use
└─────────────────────────────┘

(No toast - automatic)
```

---

## 🆘 Still Not Working?

### Share These Details:

1. **Console Output** (screenshot or copy/paste)
2. **localStorage Contents**:
   - F12 → Application → Local Storage
   - Screenshot of all `hub-*` keys

3. **Network Tab**:
   - F12 → Network → WS (WebSocket)
   - Check if WebSocket is connected

4. **Any Error Messages** in console (red text)

---

## 💡 Pro Tips

1. **Always keep console open** when testing
2. **Use incognito** for second user (clean state)
3. **Check console logs** before reporting issues
4. **Clear localStorage** if things get weird:
   ```javascript
   localStorage.clear()
   ```

---

**Good luck! 🍀**

If everything works, you should see:
- ✅ Console logs
- ✅ Toast notifications
- ✅ Loading states
- ✅ Persistent connections

All within 30 seconds of testing!
