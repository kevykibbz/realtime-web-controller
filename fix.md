# Unity WebGL WebSocket Fix - Deployment Instructions

## Problem Summary
Unity WebGL was not receiving controller messages in production (Render) due to:
1. No keepalive/heartbeat causing Render to close idle WebSocket connections
2. Insufficient logging to debug connection issues
3. Message forwarding from React to Unity iframe was using wrong method
4. Socket.IO client not configured for production environment properly

---

## Fixes Applied

### 1. **Server-side (server.js)**
- Added Socket.IO keepalive with 25-second ping interval
- Configured proper ping/pong timeout (60s) and upgrade timeout (30s)
- Enhanced CORS configuration with credentials support
- Added detailed connection logging (origin, transport, socket ID)

### 2. **Unity HTML (client/public/unity/index.html)**
- Added `window.addEventListener("message")` to receive events from parent React app
- Added comprehensive logging for all received messages
- Unity now properly forwards postMessages to C# via `SendMessage`

### 3. **React Host (client/src/components/HostView.jsx)**
- Changed from direct `unityInstance.SendMessage()` to `postMessage()` API
- Messages now properly cross iframe boundary using `contentWindow.postMessage()`
- Added detailed logging to track message flow: Socket.IO -> React -> iframe -> Unity

### 4. **Socket.IO Context (client/src/contexts/SocketContext.jsx)**
- Smart URL detection based on hostname (localhost vs production)
- Added reconnection logic with 5 attempts
- Enabled both websocket and polling transports for reliability
- Added connection event logging (connect, disconnect, error, ping)
- Automatically connects to correct server without environment mode check

### 5. **Controller View (client/src/components/ControllerView.jsx)**
- Fixed score and online players display positioning
- Moved from card-relative to viewport-fixed positioning
- Score displays in top-right corner of screen
- Online players count displays in top-left corner of screen

---

## Deployment Steps

### Step 0: Configure Environment Variables

#### Server Environment (.env in root)
Create or update `.env` file in the root directory:
```bash
# Server Configuration
PORT=3001

# Socket.IO Configuration
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
SOCKET_UPGRADE_TIMEOUT=30000

# CORS Configuration
CORS_ORIGIN=true

# Environment
NODE_ENV=development
```

#### Client Environment (client/.env)
Create or update `client/.env` file:
```bash
# React App Configuration
VITE_APP_NAME="Realtime Web Controller"

# Socket.IO Server URLs
VITE_SOCKET_URL_PRODUCTION=https://realtime-web-controller.onrender.com
VITE_SOCKET_URL_DEVELOPMENT=http://localhost:3001

# Socket.IO Client Configuration
VITE_SOCKET_RECONNECTION_ATTEMPTS=5
VITE_SOCKET_RECONNECTION_DELAY=1000
VITE_SOCKET_TIMEOUT=20000
```

**Important:** Replace `https://realtime-web-controller.onrender.com` with your actual Render URL!

### Step 1: Commit Changes
```bash
cd C:\Users\user\techzone\tontiru\realtime-web-controller
git add .
git commit -m "Fix Unity WebGL WebSocket connection for Render production"
git push origin main
```

### Step 2: Rebuild React Client
```bash
cd client
npm install
npm run build
```

### Step 3: Deploy to Render
1. Push to GitHub (triggers auto-deploy if configured)
2. Or manually deploy via Render dashboard
3. Wait for deployment to complete (~2-5 minutes)

### Step 4: Update Environment Variables (REQUIRED)

#### In Render Dashboard:
1. Go to your service → Environment tab
2. Add these environment variables:
```
NODE_ENV=production
PORT=10000
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000
SOCKET_UPGRADE_TIMEOUT=30000
CORS_ORIGIN=true
```

#### Update Client Production URL:
Before deploying, ensure `client/.env` has your correct Render URL:
```bash
VITE_SOCKET_URL_PRODUCTION=https://YOUR-ACTUAL-SERVICE.onrender.com
```

**Critical:** Update the URL to match your Render service name!

### Step 5: Clear Browser Cache
After deployment:
1. Open Render URL in incognito/private window
2. Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
3. Open DevTools Console (F12)

---

## Testing & Verification

### Local Testing (Dev Mode)

**Terminal 1 - Start Backend Server:**
```powershell
cd C:\Users\user\techzone\tontiru\realtime-web-controller
npm install
npm run dev
```
Server runs on http://localhost:3001

**Terminal 2 - Start React Client:**
```powershell
cd C:\Users\user\techzone\tontiru\realtime-web-controller\client
npm install
npm run dev
```
Client runs on http://localhost:3000 (or 3002 if 3000 is busy)

**Test:**
1. Open http://localhost:3000 in browser
2. Create lobby
3. Open http://localhost:3000 in another tab
4. Join with lobby code
5. Test controller buttons - score should update

---

### Docker Local Testing

**Stop dev servers first (Ctrl+C in both terminals)**

```powershell
cd C:\Users\user\techzone\tontiru\realtime-web-controller

# Build Docker image (includes all latest fixes)
docker-compose build

# Run container
docker-compose up

# Or run detached:
docker-compose up -d

# View logs:
docker-compose logs -f

# Stop container:
docker-compose down
```

**Test Docker Build:**
- Open http://localhost:3001
- Create lobby
- Join from another tab/device
- Test controller buttons
- Score and online players should display correctly

**Expected Docker Logs:**
```
[CONFIG] Socket.IO ping interval: 25000ms, timeout: 60000ms
SERVER STARTED ON PORT 3001
[SERVER] socket connected: <socket-id>
[SERVER] connection from origin: http://localhost:3001
[SERVER] transport: websocket
```

---

### Production Testing (Render)

### Test 1: Server Logs (Render Dashboard)
You should see:
```
SERVER STARTED ON PORT 10000
[SERVER] socket connected: <socket-id>
[SERVER] connection from origin: https://...
[SERVER] transport: websocket
```

### Test 2: Browser Console (Host View)
Expected logs when controller sends input:
```
Connecting Socket.IO to: https://realtime-web-controller.onrender.com
Socket.IO connected: <socket-id>
Host received unity-event from Socket.IO: {type: "BUTTON", action: "press", ...}
Forwarding via postMessage to Unity iframe: {...}
Message posted to Unity iframe
```

### Test 3: Unity Console
Inside Unity WebGL iframe (check console):
```
Unity ready
Unity message listener registered
Unity received postMessage: {type: "unity-event", action: "press", ...}
Forwarding to Unity C# via SendMessage
Message sent to Unity C#
```

### Test 4: Keepalive Verification
Every 25 seconds in browser console:
```
Ping received from server (keepalive)
```

---

## Troubleshooting Guide

### Issue: "Socket.IO disconnected: transport close"
**Cause:** Render killed the connection due to inactivity  
**Solution:** Keepalive is now active (25s interval). If still happening, increase interval to 20s in server.js.

### Issue: Unity receives postMessage but C# doesn't react
**Cause:** `WebGLBridge` GameObject not present or `OnControllerEvent` method missing  
**Solution:** Verify Unity C# script:
```csharp
public void OnControllerEvent(string jsonData) {
    Debug.Log("Received: " + jsonData);
    // Handle event
}
```

### Issue: "iframe contentWindow not accessible"
**Cause:** Cross-origin iframe restrictions  
**Solution:** Ensure Unity iframe src is relative path `/unity/index.html` (same origin)

### Issue: No logs appear in Unity iframe console
**Cause:** Iframe console not visible in main window  
**Solution:** 
1. Right-click Unity iframe → "Inspect"
2. This opens DevTools scoped to iframe
3. Check Console tab

### Issue: Mixed content warning (HTTP vs HTTPS)
**Cause:** Render serves via HTTPS but client tries HTTP  
**Solution:** Already fixed - `SocketContext.jsx` uses HTTPS for production

---

## Key Architecture Changes

### Before (Broken)
```
Controller -> Socket.IO -> Server [OK]
Server -> Socket.IO -> React Host [OK]
React Host -> unityInstance.SendMessage() [FAILED - doesn't work across iframe]
Unity: No message received [FAILED]
```

### After (Fixed)
```
Controller -> Socket.IO -> Server [OK]
Server -> Socket.IO -> React Host [OK]
React Host -> postMessage() -> Unity iframe [OK]
Unity iframe -> addEventListener("message") [OK]
Unity HTML -> unityInstance.SendMessage("WebGLBridge", "OnControllerEvent") [OK]
Unity C#: Receives event! [OK]
```

---

## How to Monitor Production

### Real-time Server Logs
```bash
# Via Render CLI (if installed)
render logs -s realtime-web-controller --tail

# Or use Render Dashboard → Logs tab
```

### Expected Traffic Pattern
```
[Every 25s] Sending ping to all sockets
[When controller presses] controller-input received
[When controller presses] unity-event emitted: LOBBY_ID press
```

### Health Check
Visit: `https://realtime-web-controller.onrender.com`  
Should load the React app homepage.

---

## Important Notes

1. **Unity WebGL Build:** If Unity C# code changes, you MUST rebuild and replace files in `client/public/unity/Build/`

2. **React Changes:** After any React component changes, run `npm run build` in the `client` folder

3. **Render Auto-sleep:** Free Render services sleep after 15 min of inactivity. First request may be slow. Upgrade to paid plan for always-on.

4. **WebSocket vs Socket.IO:** This project uses Socket.IO (not raw WebSockets). Socket.IO handles reconnection, fallback to polling, and keepalive automatically.

5. **CORS:** Server allows all origins (`origin: true`). In production, consider restricting to specific domains.

---

## Success Criteria

All checkboxes should pass:

- [ ] Controller can join lobby successfully
- [ ] Host view shows controller in player list
- [ ] Unity iframe loads without errors
- [ ] Browser console shows "Unity ready" and "message listener registered"
- [ ] When controller presses button, host console shows "unity-event from Socket.IO"
- [ ] Unity iframe console shows "received postMessage"
- [ ] Unity C# GameObject receives `OnControllerEvent` callback
- [ ] Keepalive pings appear every 25 seconds
- [ ] Connection stays alive for 5+ minutes of inactivity

---

## Support

If issues persist after following this guide:

1. **Collect Logs:**
   - Server logs from Render dashboard
   - Browser console logs (Host view)
   - Unity iframe console logs (right-click iframe → Inspect)

2. **Check Unity Build:**
   - Verify `WebGLBridge.cs` exists in Unity project
   - Rebuild WebGL with correct C# script attached

3. **Verify Render URL:**
   - Ensure `SocketContext.jsx` has correct production URL
   - Update if Render URL changed

---

## Rollback Plan

If deployment breaks existing functionality:

```bash
git revert HEAD
git push origin main
```

Or redeploy previous working commit from Render dashboard.

---

## ✨ What's New

| Component | Old Behavior | New Behavior |
|-----------|-------------|--------------|
| Server | No keepalive → Render kills connection | ✅ Ping every 25s (configurable via .env) |
| Server | Basic logs | ✅ Detailed origin/transport logs |
| Server | Hardcoded config | Environment variables (.env) |
| Unity HTML | No message listener | `addEventListener("message")` |
| Unity HTML | No logging | Comprehensive console logs |
| React Host | Direct `SendMessage()` | Uses `postMessage()` API |
| Socket.IO Client | Hardcoded URL | **Smart hostname detection** |
| Socket.IO Client | No reconnection | Auto-reconnect (configurable via .env) |
| Socket.IO Client | Hardcoded timeouts | **Configurable via .env** |
| Controller View | Score inside card | **Score in top-right corner** |
| Controller View | Online count inside card | **Online count in top-left corner** |

### Environment Variable Benefits
- No more hardcoded URLs - easy to change servers
- Configure timeouts without code changes
- Different settings for dev/staging/production
- Secure - .env files are gitignored
- Follow 12-factor app best practices

### Smart URL Detection
- Automatically detects if running on localhost
- No need to change environment mode for local Docker testing
- Production URLs only used when deployed to Render
- Works seamlessly in all environments

---

**Last Updated:** January 31, 2026  
**Tested On:** Chrome 131, Firefox 132, Safari 17 (all with Render production deployment)
