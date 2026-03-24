# Unity Integration Fix

## Error
Client reported: `System.FormatException: Input string was not in a correct format`

## Root Causes

1. **Method name mismatch**: Unity C# had `OnControllerEvent` but JavaScript bridge called `OnControllerInput` - Unity never received events
2. **Server not broadcasting**: Server received controller inputs but didn't send them to Unity host
3. **Wrong data structure**: Unity expected `{type, action, playerId}` but received different format
4. **Hardcoded server URL**: socketBridge had placeholder URL instead of auto-detection

## Files Fixed

### server.js
Added broadcast to Unity host with proper data structure:
```javascript
io.to(lobbyId).emit('controller-input', {
  type: data.type || 'BUTTON',
  action: data.action,
  playerId: socket.id,
  playerName: player.name
});
```

### revisions/socketBridge.jslib
- Fixed method name: `OnControllerInput` → `OnControllerEvent`
- Auto-detect server: `window.location.origin`
- Transform data to Unity format: `{type, action, playerId}`
- Added error handling

### revisions/WebGLBridge.cs
Complete Unity script with player tracking and error handling

### revisions/unity-host-template.html
Unity host page with lobby creation UI

## Client Instructions

Copy to Unity project:
1. `revisions/socketBridge.jslib` → `Assets/Plugins/WebGL/socketBridge.jslib`
2. `revisions/WebGLBridge.cs` → `Assets/Scripts/WebGLBridge.cs`

Then rebuild WebGL. Error should be resolved.
