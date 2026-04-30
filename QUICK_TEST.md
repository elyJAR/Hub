# Quick Test Guide - 5 Minutes

## 🚀 Start Server
```bash
npm run dev
```
Wait for: `✓ Ready on http://localhost:3000`

---

## 👥 Open Two Windows

**Window 1** (Alice):
- Open: http://localhost:3000
- Press: `F12` (open console)
- Join as: "Alice"

**Window 2** (Bob):
- Open: http://localhost:3000 (incognito mode)
- Press: `F12` (open console)
- Join as: "Bob"

---

## ✅ Test 1: Loading State (30 seconds)

**In Alice's window:**
1. Click "Send Connection Request" for Bob
2. **Check immediately:**
   - [ ] Button shows spinner ⟳
   - [ ] Button text: "Waiting for response..."
   - [ ] Button is gray/disabled
   - [ ] Blue toast: "Connection request sent"
   - [ ] Console: `[UserList] Sending connection request to: ...`

**If ALL checked** → ✅ Loading state works!

---

## ✅ Test 2: Toast Notifications (30 seconds)

**In Bob's window:**
1. Click "Accept" on connection request
2. **Check:**
   - [ ] Green toast: "Connected with Alice"
   - [ ] Console: `[UserList] Connection established: ...`

**In Alice's window:**
1. **Check:**
   - [ ] Green toast: "Connected with Bob"
   - [ ] Loading state disappears
   - [ ] Shows "Message" and "📞" buttons
   - [ ] Console: `[UserList] Saving connection displayNames: ["Bob"]`

**If ALL checked** → ✅ Toasts work!

---

## ✅ Test 3: Persistent Connections (1 minute)

**In Alice's window:**
1. Press `F5` to refresh
2. Join as "Alice" again
3. **Check:**
   - [ ] Console: `[UserList] Loaded saved connection displayNames: ["Bob"]`
   - [ ] Console: `[UserList] Mapped Bob -> session-...`
   - [ ] Bob shows as "Connected" (green dot)
   - [ ] "Message" and "📞" buttons visible
   - [ ] NO "Send Connection Request" button

**If ALL checked** → ✅ Persistence works!

---

## ✅ Test 4: localStorage (30 seconds)

**In Alice's window:**
1. Press `F12`
2. Go to **Application** tab
3. Expand **Local Storage** → `http://localhost:3000`
4. Find key: `hub-connections-Alice`
5. **Check value:**
   - [ ] Value is: `["Bob"]`
   - [ ] It's a displayName, NOT sessionId

**If checked** → ✅ Storage works!

---

## 🎉 Success!

If all 4 tests passed:
- ✅ Loading states work
- ✅ Toast notifications work
- ✅ Connections persist
- ✅ localStorage works correctly

**You're done!** 🎊

---

## ❌ Something Failed?

### No console logs?
```bash
# Restart server
Ctrl+C
npm run dev

# Hard refresh browser
Ctrl+Shift+R
```

### No toasts?
```javascript
// Test in browser console:
const { toast } = await import('/src/lib/toast.ts')
toast.success('Test')
```

### Connections don't persist?
```javascript
// Check localStorage in console:
console.log(localStorage.getItem('hub-connections-Alice'))
// Should show: ["Bob"]
```

### Still stuck?
Read `DEBUGGING_GUIDE.md` for detailed troubleshooting.

---

## 📊 Expected Timeline

- ⏱️ **Setup**: 1 minute (start server, open windows)
- ⏱️ **Test 1**: 30 seconds (loading state)
- ⏱️ **Test 2**: 30 seconds (toasts)
- ⏱️ **Test 3**: 1 minute (persistence)
- ⏱️ **Test 4**: 30 seconds (localStorage)

**Total**: ~5 minutes

---

## 🎯 Quick Checklist

- [ ] Server running
- [ ] Two windows open (one incognito)
- [ ] Console open in both (F12)
- [ ] Joined as different users
- [ ] Loading state shows on request
- [ ] Toasts appear on connection
- [ ] Connection persists after refresh
- [ ] localStorage has displayNames

**All checked?** → 🎉 **SUCCESS!**

---

**Pro Tip**: Keep console open the entire time to see all the debug logs!
