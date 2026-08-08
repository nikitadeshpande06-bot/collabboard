# API Reference — CollabBoard Backend

Base URL: `http://localhost:4000/api`

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

---

## Auth

### POST `/auth/register`
Create a new account.

**Body:** `{ name, email, password }`  
**Response 201:** `{ accessToken, refreshToken, user }`

---

### POST `/auth/login`
Authenticate existing user.

**Body:** `{ email, password }`  
**Response 200:** `{ accessToken, refreshToken, user }`

---

### POST `/auth/refresh`
Exchange a refresh token for a new access token.

**Body:** `{ refreshToken }`  
**Response 200:** `{ accessToken }`

---

## Users

### GET `/users/me`  🔒
Get the authenticated user's profile.

### PATCH `/users/me`  🔒
Update name or avatar.

**Body:** `{ name?, avatar? }`

---

## Rooms

### GET `/rooms`  🔒
List all rooms the user is a member of.

### POST `/rooms`  🔒
Create a new room.

**Body:** `{ name, description?, isPublic? }`  
**Response 201:** Room object (includes `inviteToken`)

### GET `/rooms/:roomId`  🔒
Get room details including members and latest canvas.

### PATCH `/rooms/:roomId/canvas`  🔒 (editor+)
Persist the latest canvas JSON.

**Body:** `{ canvasData: string }`

### PATCH `/rooms/:roomId/members/:memberId`  🔒 (owner)
Change a member's role.

**Body:** `{ role: 'editor' | 'viewer' }`

### DELETE `/rooms/:roomId`  🔒 (owner)
Delete the room.

### POST `/rooms/join/:inviteToken`  🔒
Join a room via invite link.

---

## Versions

### GET `/versions/:roomId`  🔒 (viewer+)
List all version snapshots (no canvas blob, just metadata).

### POST `/versions/:roomId`  🔒 (editor+)
Create a named snapshot.

**Body:** `{ label?, canvasData }`

### GET `/versions/:roomId/:versionId`  🔒 (viewer+)
Get full snapshot including canvas data.

### POST `/versions/:roomId/:versionId/restore`  🔒 (editor+)
Restore canvas to this version.

---

## WebSocket Events (Socket.IO)

Connect with: `io(SOCKET_URL, { auth: { token: accessToken } })`

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `room:join` | `{ roomId }` | Join a socket room |
| `room:leave` | `{ roomId }` | Leave a socket room |
| `draw:operation` | `DrawOperation` | Broadcast a drawing change |
| `draw:canvas_save` | `{ roomId, canvasData }` | Persist full canvas |
| `cursor:move` | `{ roomId, x, y }` | Broadcast cursor position |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room:canvas_init` | `{ canvasData }` | Full canvas on join |
| `room:user_joined` | `{ userId, userName, socketId }` | Someone joined |
| `room:user_left` | `{ userId, socketId }` | Someone left |
| `draw:operation` | `DrawOperation` | Remote drawing op |
| `draw:canvas_saved` | `{ savedBy }` | Canvas was saved |
| `cursor:move` | `{ roomId, userId, userName, x, y }` | Remote cursor |

---

## DrawOperation Schema

```json
{
  "id":          "uuid-v4",
  "roomId":      "mongodb-objectid",
  "userId":      "mongodb-objectid",
  "userName":    "string",
  "type":        "add | modify | remove | clear",
  "objectId":    "uuid-v4 (fabric object id)",
  "data":        "any (serialised Fabric.js object)",
  "timestamp":   1720000000000,
  "vectorClock": { "userId": 3 }
}
```
