# Testing Guide - New Features

## Quick Testing Checklist

### Prerequisites
```bash
# Start the server
npm run dev

# Open two browser windows
# Window 1: http://localhost:3000
# Window 2: http://localhost:3000 (incognito/private mode)
```

---

## Test 1: Persistent Connections ✅

### Steps:
1. **Window 1**: Join as "Alice"
2. **Window 2**: Join as "Bob"
3. **Window 1**: Send connection request to Bob
4. **Window 2**: Accept the request
5. **Verify**: Both see "Connected" status
6. **Window 1**: Refresh the page (F5)
7. **Window 1**: Join again as "Alice"
8. **✅ Expected**: Bob still shows as "Connected" (no need to request again)

### What to Look For:
- ✅ Green dot next to Bob's name
- ✅ "Connected" status text
- ✅ "Message" and "Call" buttons visible
- ✅ No "Send Connection Request" button

---

## Test 2: Loading States ✅

### Steps:
1. **Window 1**: Join as "Alice"
2. **Window 2**: Join as "Bob"
3. **Window 1**: Click "Send Connection Request" for Bob
4. **✅ Expected**: Button changes to show loading state
5. **Window 2**: Wait 5 seconds before accepting
6. **✅ Expected**: Alice still sees "Waiting for response..."
7. **Window 2**: Accept the request
8. **✅ Expected**: Loading state disappears, shows "Connected"

### What to Look For:
- ✅ Button shows spinner icon (⟳)
- ✅ Button text: "Waiting for response..."
- ✅ Button is gray and disabled
- ✅ Status text: "Request pending..."
- ✅ Loading state disappears when accepted

---

## Test 3: Toast Notifications ✅

### Test 3a: Connection Notifications

**Steps:**
1. **Window 1**: Join as "Alice"
2. **Window 2**: Join as "Bob"
3. **Window 1**: Send connection request
   - **✅ Expected**: Blue toast "Connection request sent"
4. **Window 2**: Accept request
   - **✅ Expected**: Green toast "Connected with Alice"
5. **Window 1**: Should see green toast "Connected with Bob"

### Test 3b: Message Notifications

**Steps:**
1. Ensure Alice and Bob are connected
2. **Window 1**: Open chat with Bob
3. **Window 1**: Type a message and send
   - **✅ Expected**: No toast (instant feedback in chat)
4. **Window 1**: Hover over message, click edit icon
5. **Window 1**: Edit the message
   - **✅ Expected**: Blue toast "Message edited"
6. **Window 1**: Click delete icon
   - **✅ Expected**: Blue toast "Message deleted"

### Test 3c: File Transfer Notifications

**Steps:**
1. **Window 1**: Click attachment icon
2. **Window 1**: Select a file < 5MB
   - **✅ Expected**: Blue toast "File transfer request sent"
3. **Window 2**: Should see blue toast "[Alice] wants to send you a file"
4. **Window 2**: Click "Accept"
   - **✅ Expected**: Green toast "File transfer accepted"
5. **Window 1**: Try to send file > 5MB
   - **✅ Expected**: Red toast "File is too large!"

### Test 3d: Voice Call Notifications

**Steps:**
1. **Window 1**: Click phone icon next to Bob
   - **✅ Expected**: Blue toast "Calling..."
2. **Window 2**: Should see blue toast "Incoming call from Alice"
3. **Window 2**: Click "Accept"
   - **✅ Expected**: Green toast "Call connected"
4. **Window 1**: Click "End Call"
   - **✅ Expected**: Blue toast "Call ended"
5. **Window 2**: Should see blue toast "Call ended by other user"

### Test 3e: Declined Actions

**Steps:**
1. **Window 1**: Send connection request to Bob
2. **Window 2**: Click "Decline"
   - **✅ Expected**: Red toast "Alice declined your request" (on Window 1)
3. **Window 1**: Start a call
4. **Window 2**: Click "Decline"
   - **✅ Expected**: Red toast "Call was declined" (on Window 1)

---

## Test 4: Toast Animations ✅

### Steps:
1. Trigger any notification
2. **✅ Expected**: Toast slides up from bottom
3. Wait 3 seconds
4. **✅ Expected**: Toast fades out smoothly
5. Trigger multiple notifications quickly
6. **✅ Expected**: Toasts stack properly (don't overlap)

---

## Test 5: Persistence Across Sessions ✅

### Steps:
1. **Window 1**: Join as "Alice"
2. **Window 2**: Join as "Bob"
3. Connect Alice and Bob
4. **Window 1**: Close the browser completely
5. **Window 1**: Reopen browser, go to http://localhost:3000
6. **Window 1**: Join as "Alice" again
7. **✅ Expected**: Bob still shows as "Connected"

### What to Check:
- ✅ Connection persists after browser close
- ✅ Connection persists after page refresh
- ✅ Connection is user-specific (Alice's connections ≠ Bob's connections)

---

## Test 6: Error Scenarios ✅

### Test 6a: Request Timeout
**Steps:**
1. Send connection request
2. Wait 30 seconds without accepting
3. **✅ Expected**: Request expires, can send again

### Test 6b: Duplicate Requests
**Steps:**
1. Send connection request
2. Try to send another request while first is pending
3. **✅ Expected**: Button is disabled, can't send duplicate

### Test 6c: Network Disconnect
**Steps:**
1. Connect Alice and Bob
2. Stop the server
3. **✅ Expected**: "Disconnected" status shown
4. Restart server
5. **✅ Expected**: Auto-reconnect, connections restored

---

## Test 7: Mobile Responsiveness ✅

### Steps:
1. Open on mobile device or use browser dev tools (F12)
2. Set viewport to mobile (iPhone/Android)
3. Test all features:
   - ✅ Toasts appear in correct position
   - ✅ Loading states are visible
   - ✅ Buttons are touch-friendly
   - ✅ Text is readable

---

## Test 8: Multiple Users ✅

### Steps:
1. Open 3 browser windows (Alice, Bob, Charlie)
2. Alice connects with Bob
3. Alice connects with Charlie
4. **✅ Expected**: Alice sees both connections
5. Refresh Alice's window
6. **✅ Expected**: Both connections persist

---

## Visual Checklist

### Connection States:
- [ ] Not connected: Blue "Send Connection Request" button
- [ ] Pending: Gray button with spinner + "Waiting for response..."
- [ ] Connected: Green dot + "Message" and "Call" buttons

### Toast Colors:
- [ ] Success: Green background, white text, ✓ icon
- [ ] Error: Red background, white text, ✕ icon
- [ ] Info: Blue background, white text, ℹ icon
- [ ] Warning: Yellow background, white text, ⚠ icon

### Animations:
- [ ] Toast slides up smoothly
- [ ] Toast fades out after 3 seconds
- [ ] Spinner rotates continuously
- [ ] Transitions are smooth (no jank)

---

## Common Issues & Solutions

### Issue: Toasts not appearing
**Solution**: Check browser console for errors, ensure toast.ts is imported

### Issue: Connections not persisting
**Solution**: Check localStorage in browser dev tools (Application tab)

### Issue: Loading state stuck
**Solution**: Check WebSocket connection, ensure server is running

### Issue: Multiple toasts overlapping
**Solution**: This is expected, they should stack vertically

---

## Performance Checks

### Things to Monitor:
- [ ] Toasts don't cause lag
- [ ] Loading states update instantly
- [ ] LocalStorage doesn't grow too large
- [ ] Memory usage stays reasonable
- [ ] No console errors

---

## Browser Compatibility

Test on:
- [ ] Chrome (Desktop)
- [ ] Firefox (Desktop)
- [ ] Safari (Desktop)
- [ ] Edge (Desktop)
- [ ] Chrome (Mobile)
- [ ] Safari (iOS)

---

## Success Criteria

All tests pass if:
- ✅ Connections persist across page reloads
- ✅ Loading states show for pending requests
- ✅ Toast notifications appear for all actions
- ✅ Animations are smooth
- ✅ No console errors
- ✅ Works on all browsers
- ✅ Mobile responsive

---

## Quick Test Script

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run E2E tests (if available)
npm run test:e2e

# Manual testing:
# 1. Open http://localhost:3000 in two windows
# 2. Join as different users
# 3. Send connection request
# 4. Verify loading state
# 5. Accept request
# 6. Verify toast notifications
# 7. Refresh page
# 8. Verify connection persists
```

---

## Report Issues

If you find any bugs:
1. Note the steps to reproduce
2. Take a screenshot
3. Check browser console for errors
4. Report in GitHub issues

---

**Happy Testing! 🧪**
