# CollabBoard — Complete Project Documentation
### Real-Time Collaborative Whiteboard · Interview & Portfolio Reference

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [ER Diagram (Data Models)](#4-er-diagram-data-models)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Backend Architecture](#6-backend-architecture)
7. [Real-Time Communication (Socket.IO Events)](#7-real-time-communication-socketio-events)
8. [Feature-by-Feature Explanation](#8-feature-by-feature-explanation)
9. [Offline-First Architecture](#9-offline-first-architecture)
10. [Security Design](#10-security-design)
11. [State Management Deep-Dive](#11-state-management-deep-dive)
12. [Keyboard Shortcuts Reference](#12-keyboard-shortcuts-reference)
13. [API Reference](#13-api-reference)
14. [Interview Q&A — How to Talk About This Project](#14-interview-qa--how-to-talk-about-this-project)
15. [Folder Structure](#15-folder-structure)

---

## 1. Project Overview

**CollabBoard** is a production-grade, real-time collaborative whiteboard SaaS. Multiple users can draw, annotate, and collaborate on a shared digital canvas simultaneously — think Miro or Figma's whiteboard, but built from scratch.

### Core Capabilities at a Glance

| Category | What it does |
|---|---|
| Real-Time Drawing | Multiple users draw together; changes appear instantly for all |
| Full Shape Library | Pencil, Rectangle, Circle, Triangle, Diamond, Hexagon, Star, Arrow, Speech Bubble |
| Content Tools | Text (rich formatting), Sticky Notes, Tables/Grids, Image Upload |
| Templates | Kanban Board, Retrospective, Mind Map, Brainstorm — all fully customisable before applying |
| Version History | Named snapshots, restore to any past version |
| Offline Mode | Draws while disconnected; queues ops in IndexedDB; auto-syncs on reconnect |
| Conflict Resolution | Vector-clock-based last-write-wins for concurrent edits |
| Export | PNG (2×), SVG, PDF, JSON |
| Session Analytics | Live operation counts, per-user contribution leaderboard, session timer |
| Laser Pointer | Presenter mode — broadcasts your cursor as a glowing dot to all collaborators |
| Comment Pins | Drop anchored text comments anywhere on the canvas |
| Activity Feed | Real-time audit log: who drew/edited/deleted and when |
| Drawing Playback | Record strokes, replay them at 0.5×–4× speed (event-sourcing pattern) |
| Room Chat | Ephemeral real-time text chat inside every board |
| Access Control | Owner / Editor / Viewer roles; invite via unique token link |
| Dark Mode | System-aware dark/light toggle |
| Voice-to-Text | Mic input places transcribed text directly on the canvas |

---

## 2. Technology Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | UI library |
| TypeScript | 5 | Type safety |
| Vite | 5 | Build tool & dev server |
| Tailwind CSS | 3 | Utility-first styling |
| Fabric.js | 5.3 | HTML5 Canvas abstraction — shapes, text, groups, serialisation |
| Zustand | 4 | Lightweight global state (canvas settings, auth, room) |
| TanStack Query | 5 | Server state management, caching, mutations |
| Socket.IO Client | 4 | WebSocket real-time connection |
| Axios | 1 | HTTP client with interceptors |
| idb | 8 | IndexedDB wrapper for offline queue |
| react-hot-toast | 2 | Toast notifications |
| react-router-dom | 6 | Client-side routing |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 | Runtime |
| Express | 4 | HTTP server & routing |
| TypeScript | 5 | Type safety |
| Socket.IO Server | 4 | WebSocket event broker |
| MongoDB | 7 | Primary database (rooms, users, versions) |
| Mongoose | 8 | ODM — schema validation & queries |
| Redis | 7 | Socket.IO adapter for multi-instance pub/sub |
| JWT (jsonwebtoken) | 9 | Access + refresh token auth |
| bcryptjs | 2 | Password hashing |
| Passport.js | 0.7 | OAuth2 strategy (Google) |
| Winston | 3 | Structured logging |
| Jest | 29 | Unit + integration tests |

### Infrastructure
| Tool | Purpose |
|---|---|
| Docker | Containerise client, server, MongoDB, Redis |
| Docker Compose | Local dev orchestration |
| GitHub Actions | CI/CD — lint → test → build → deploy |
| Vercel | Frontend deployment |
| Render / Railway | Backend deployment |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                            │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  React   │  │  Fabric.js   │  │   Zustand   │  │React Query │  │
│  │  Pages   │  │CanvasEngine  │  │    State    │  │  (HTTP)    │  │
│  └────┬─────┘  └──────┬───────┘  └──────┬──────┘  └─────┬──────┘  │
│       │               │                 │               │          │
│  ┌────▼───────────────▼─────────────────▼───────────────▼──────┐  │
│  │              Socket.IO Client  /  Axios HTTP Client           │  │
│  └────────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────────┼─────────────────────────────────────┘
                                │ WSS + HTTPS
┌───────────────────────────────▼─────────────────────────────────────┐
│                         NODE.JS SERVER                              │
│                                                                     │
│  ┌──────────────────┐  ┌────────────────────────────────────────┐  │
│  │  Express REST    │  │          Socket.IO Server               │  │
│  │  /api/auth       │  │  room:join/leave  draw:operation        │  │
│  │  /api/rooms      │  │  cursor:move      chat:message          │  │
│  │  /api/versions   │  │  laser:move/stop  comment:add/delete    │  │
│  │  /api/users      │  │  activity:event   draw:canvas_save      │  │
│  └────────┬─────────┘  └──────────────────┬─────────────────────┘  │
│           │                               │                         │
│  ┌────────▼───────────────────────────────▼─────────────────────┐  │
│  │              Business Logic / Controllers / Middleware          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                │                               │                    │
│  ┌─────────────▼───────────┐  ┌───────────────▼───────────────┐   │
│  │     MongoDB (Mongoose)  │  │  Redis (Socket.IO Adapter)    │   │
│  │  User, Room, Version    │  │  Pub/Sub for multi-instance   │   │
│  └─────────────────────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow for a Draw Operation

```
User draws on canvas
      │
      ▼
Fabric.js fires 'path:created' / 'object:modified' / 'object:removed'
      │
      ▼
CanvasEngine.emitAdd() / emitModify() / emitRemove()
  → creates DrawOperation { id, roomId, userId, type, data, vectorClock }
      │
      ▼
useWhiteboardCanvas.handleLocalOp()
  ├─ Online?  → emitDrawOperation() → Socket.IO → Server
  └─ Offline? → enqueueOperation()  → IndexedDB queue
      │
      ▼ (server receives)
Socket.IO server validates JWT, finds room, broadcasts to all other room members
      │
      ▼ (other clients receive)
useWhiteboardCanvas 'draw:operation' listener
  → applyRemoteOperation() → CanvasEngine renders the object on their canvas
```

---

## 4. ER Diagram (Data Models)

```
┌───────────────────────────────────┐
│             USER                  │
├───────────────────────────────────┤
│ _id          : ObjectId (PK)      │
│ name         : String             │
│ email        : String (unique)    │
│ password     : String (hashed)    │
│ avatar       : String?            │
│ googleId     : String?            │
│ refreshTokens: String[]           │
│ role         : 'user' | 'admin'   │
│ createdAt    : Date               │
│ updatedAt    : Date               │
└───────────┬───────────────────────┘
            │ 1
            │ belongs to many rooms (via RoomMember)
            │ M
┌───────────▼───────────────────────┐       ┌──────────────────────────┐
│          ROOMMEMBER (embedded)    │       │         VERSION          │
├───────────────────────────────────┤       ├──────────────────────────┤
│ user      : ObjectId → User       │       │ _id         : ObjectId   │
│ role      : 'owner'|'editor'      │       │ room        : ObjectId → Room│
│            |'viewer'              │       │ createdBy   : ObjectId → User│
│ joinedAt  : Date                  │       │ label       : String     │
└───────────┬───────────────────────┘       │ versionNumber: Number    │
            │ M                             │ canvasData  : String     │
            │ embedded in                   │ createdAt   : Date       │
            │ 1                             └──────────────────────────┘
┌───────────▼───────────────────────┐                │
│             ROOM                  │◄───────────────┘
├───────────────────────────────────┤  1:M
│ _id         : ObjectId (PK)       │
│ name        : String              │
│ description : String?             │
│ canvasData  : String (JSON)       │
│ members     : RoomMember[]        │
│ inviteToken : String (unique)     │
│ isPublic    : Boolean             │
│ createdBy   : ObjectId → User     │
│ createdAt   : Date                │
│ updatedAt   : Date                │
└───────────────────────────────────┘

──── FRONTEND-ONLY (not persisted) ──────────────────────

┌───────────────────────────────────┐
│          DrawOperation            │
├───────────────────────────────────┤
│ id          : UUID                │
│ roomId      : string              │
│ userId      : string              │
│ userName    : string              │
│ type        : 'add'|'modify'|     │
│               'remove'|'clear'    │
│ objectId    : string?             │
│ data        : unknown (Fabric JSON│
│ timestamp   : number              │
│ vectorClock : Record<userId,int>  │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│       CommentPin (in-memory)      │
├───────────────────────────────────┤
│ id          : UUID                │
│ x, y        : number              │
│ text        : string              │
│ userId      : string              │
│ userName    : string              │
│ createdAt   : number              │
└───────────────────────────────────┘

┌───────────────────────────────────┐
│    IndexedDB: pending_ops         │
│    (offline queue)                │
├───────────────────────────────────┤
│ key: op.id (UUID)                 │
│ value: DrawOperation + queuedAt   │
└───────────────────────────────────┘
```

### Relationships Summary

| From | To | Relationship |
|---|---|---|
| User | Room | Many-to-Many via `members[]` embedded array |
| Room | Version | One-to-Many (1 room → many snapshots) |
| Version | User | Many-to-One (each version has one creator) |
| Room | User (createdBy) | Many-to-One |
| DrawOperation | Room | Many-to-One (runtime, not persisted) |

---

## 5. Frontend Architecture

### Page & Route Map

| Route | Component | Auth Required | Description |
|---|---|---|---|
| `/` | `RoleSelectorPage` | No | Entry — choose Student / Professional / Admin |
| `/login` | `LoginPage` | No | Email+password + Google OAuth |
| `/register` | `RegisterPage` | No | Account creation |
| `/forgot-password` | `ForgotPasswordPage` | No | Password reset flow |
| `/oauth-callback` | `OAuthCallbackPage` | No | Handles Google OAuth redirect |
| `/dashboard` | `DashboardPage` | ✅ | My Boards list — create, delete, open |
| `/room/:roomId` | `WhiteboardPage` | ✅ | Main canvas + all tools |
| `/admin` | `AdminPage` | ✅ | User management, system stats |
| `/join/:inviteToken` | `JoinRoomPage` | ✅ | Accept invite link |

### Component Tree (WhiteboardPage)

```
WhiteboardPage
├── <header>
│   ├── CollabBoard logo / room name
│   ├── OfflineBadge (only when disconnected)
│   ├── TextFormatBar (only when text object selected)
│   ├── TemplatesPanel         — load pre-built board layouts
│   ├── ExportPanel            — PNG / SVG / PDF / JSON
│   ├── AnalyticsPanel         — session stats & leaderboard
│   ├── PlaybackPanel          — record & replay drawing sessions
│   ├── ActivityFeed           — real-time audit log
│   ├── LaserPointer           — presenter broadcast cursor
│   ├── CommentPins            — anchored canvas comments
│   ├── KeyboardShortcuts      — shortcut cheat sheet
│   ├── DarkMode toggle
│   ├── Chat toggle
│   ├── UserList               — online collaborators
│   └── VersionPanel           — snapshot history
│
├── <main>
│   ├── Toolbar (left sidebar)
│   │   ├── Draw: Select, Pencil, Eraser, Pan
│   │   ├── Shapes: Rect, Circle, Line + extended panel
│   │   ├── Insert: Text, Sticky Note, Table
│   │   ├── Stroke colour / width / opacity panel
│   │   ├── Fill colour panel
│   │   └── Mic (voice-to-text) button
│   │
│   ├── Canvas container
│   │   ├── <canvas id="main-canvas">  ← Fabric.js renders here
│   │   └── CursorOverlay              ← remote user cursor labels
│   │
│   ├── CanvasContextMenu (right-click menu)
│   └── ChatSidebar (slides in from right)
```

### Custom Hooks

| Hook | File | Responsibility |
|---|---|---|
| `useWhiteboardCanvas` | `hooks/useWhiteboardCanvas.ts` | Lifecycle mgmt of CanvasEngine, routes local ops to socket/queue, listens for remote ops, auto-saves every 30s |
| `useOfflineSync` | `hooks/useOfflineSync.ts` | On `navigator.online`, drains IndexedDB queue and re-emits operations in order |
| `useNetworkStatus` | `hooks/useNetworkStatus.ts` | Wraps `navigator.onLine` + `online`/`offline` events |
| `useDarkMode` | `hooks/useDarkMode.ts` | Persists dark/light preference, applies `dark` class to `<html>` |

---

## 6. Backend Architecture

### Server File Structure

```
server/src/
├── index.ts              ← Express + Socket.IO bootstrap
├── config/               ← DB, Redis, JWT config
├── controllers/          ← Route handlers (auth, rooms, versions, users)
├── middleware/           ← JWT auth guard, role check, rate-limiter
├── models/               ← Mongoose schemas: User, Room, Version
├── routes/               ← Express routers
├── socket/               ← Socket.IO event handlers per namespace
├── services/             ← Business logic (canvas save, version create)
├── utils/                ← Logger (Winston), helpers
└── tests/                ← Jest unit + integration tests
```

### Request Lifecycle

```
HTTP Request
    │
    ▼
Express Router (routes/)
    │
    ▼
Auth Middleware  (verifyJWT → decode token → attach req.user)
    │
    ▼
Role Middleware  (requireRole('editor') — checks room membership)
    │
    ▼
Controller       (validate body, call service)
    │
    ▼
Service / Model  (Mongoose query)
    │
    ▼
JSON Response
```

### JWT Strategy

```
Login / Register
    │
    └─→ Server signs:
        accessToken  (expires: 15 min)  → sent in JSON body
        refreshToken (expires: 7 days)  → stored in User.refreshTokens[]

Client stores both in Zustand (persisted to localStorage via zustand/persist)

Every request:
    Authorization: Bearer <accessToken>

On 401 response:
    Axios interceptor → POST /auth/refresh { refreshToken }
    → new accessToken issued → retry original request
    → if refresh also fails → logout() + redirect to /login
```

---

## 7. Real-Time Communication (Socket.IO Events)

### Connection

- Client connects with `auth: { token }` in Socket.IO handshake
- Server middleware verifies JWT on every connection
- Transport: WebSocket only (`transports: ['websocket']`)
- Reconnection: exponential backoff (1s → 5s max), infinite attempts

### Event Reference

#### Room Presence
| Event | Direction | Payload | Description |
|---|---|---|---|
| `room:join` | Client → Server | `{ roomId }` | Join a room namespace |
| `room:leave` | Client → Server | `{ roomId }` | Leave a room |
| `room:user_joined` | Server → Client | `OnlineUser` | Someone joined |
| `room:user_left` | Server → Client | `{ socketId, userId }` | Someone left |
| `room:canvas_init` | Server → Client | `{ canvasData }` | Canvas state on join |

#### Drawing
| Event | Direction | Payload | Description |
|---|---|---|---|
| `draw:operation` | Client ↔ Server | `DrawOperation` | A single canvas mutation |
| `draw:canvas_save` | Client → Server | `{ roomId, canvasData }` | Full canvas auto-save every 30s |

#### Cursor
| Event | Direction | Payload | Description |
|---|---|---|---|
| `cursor:move` | Client → Server | `{ roomId, x, y }` | Throttled mouse position |
| (broadcast) | Server → Clients | `CursorPosition` | Relayed to room peers |

#### Laser Pointer
| Event | Direction | Payload | Description |
|---|---|---|---|
| `laser:move` | Client → Server | `{ roomId, x, y }` | **volatile** — dropped under load |
| `laser:stop` | Client → Server | `{ roomId }` | Laser deactivated |
| `laser:move` | Server → Clients | `LaserDot` | Broadcast to peers |
| `laser:stop` | Server → Clients | `{ userId }` | Remove dot from peers |

#### Chat
| Event | Direction | Payload | Description |
|---|---|---|---|
| `chat:message` | Client → Server | `{ roomId, ...ChatMessage }` | Send a message |
| `chat:message` | Server → Clients | `ChatMessage` | Broadcast to room |

#### Comments
| Event | Direction | Payload | Description |
|---|---|---|---|
| `comment:add` | Client → Server | `{ roomId, ...CommentPin }` | Drop a pin |
| `comment:delete` | Client → Server | `{ roomId, id }` | Remove a pin |
| `comment:add` | Server → Clients | `CommentPin` | Broadcast new pin |
| `comment:delete` | Server → Clients | `{ id }` | Broadcast deletion |

#### Activity Feed
| Event | Direction | Payload | Description |
|---|---|---|---|
| `activity:event` | Client → Server | `{ roomId, action }` | Log a user action |
| `activity:event` | Server → Clients | `ActivityEvent` | Broadcast to room |

### Conflict Resolution: Vector Clocks

Each `DrawOperation` carries a `vectorClock: Record<userId, number>`.

```
User A and User B both move the same object concurrently:
  A: { A:3, B:2 }  (A's clock is newer on A's side)
  B: { A:2, B:3 }  (B's clock is newer on B's side)

When server receives both:
  → Compare clocks: neither strictly dominates the other → concurrent
  → Apply last-write-wins: whichever arrived at the server last wins
  → This is the same approach used by Amazon Dynamo
```

---

## 8. Feature-by-Feature Explanation

### 8.1 Canvas Engine (`CanvasEngine.ts`)

The `CanvasEngine` class wraps Fabric.js and is the core of the whole application.

**Responsibilities:**
- Creates and sizes the Fabric.js canvas to fill its container
- Handles all tool switching (`applyTool()`) — drawing mode, selection mode, etc.
- Listens to Fabric events (`path:created`, `object:added`, `object:modified`, `object:removed`) and converts them to `DrawOperation` objects
- Applies remote operations from other users (`applyRemoteOperation()`)
- Manages undo/redo stacks (array of JSON snapshots, capped at 50)
- Provides `insertTable()`, `insertImage()`, clipboard operations

**How shape tools work:**
1. User clicks a shape tool button → `store.setTool('rect')`
2. `useWhiteboardCanvas` calls `engine.applyTool('rect')` — sets Fabric to non-drawing mode, disables selection
3. User clicks canvas → `engine.addShape('rect', x, y)` creates a `fabric.Rect` and adds it
4. Fabric fires `object:added` → engine captures it → creates a `DrawOperation { type: 'add', data: obj.toJSON() }`
5. Hook routes op to socket or offline queue

**Undo/Redo:**
- Every mutation calls `snapshotHistory()` — serialises entire canvas to JSON, pushes to `undoStack`
- `undo()` pops from `undoStack`, pushes current to `redoStack`, reloads the popped snapshot
- Pure snapshot approach = simple, correct, no partial-state bugs

### 8.2 Draw Tools (Toolbar)

| Tool | Icon | How it works |
|---|---|---|
| **Select** (V) | ↖ | Enables `canvas.selection = true`; objects become draggable/resizable |
| **Pencil** (P) | ✏️ | `canvas.isDrawingMode = true` with `PencilBrush` — free-draw paths |
| **Eraser** (E) | ⌫ | `PencilBrush` with white colour + 5× width — paints over canvas |
| **Pan** (H) | ✋ | Listens to `mousedown`/`mousemove` and calls `canvas.relativePan()` |
| **Rectangle** (R) | ▭ | On click → `fabric.Rect` at cursor position |
| **Circle** (C) | ◯ | On click → `fabric.Ellipse` |
| **Line** | ╱ | `fabric.Line([x,y, x+140,y])` |
| **Triangle** | △ | SVG path via `regularPolygon()` helper (3-sided) |
| **Diamond** | ◇ | `regularPolygon()` 4-sided rotated 45° |
| **Hexagon** | ⬡ | `regularPolygon()` 6-sided |
| **Star** | ★ | Custom `starPath()` — alternates outer/inner radius |
| **Arrow** | ➡ | Custom `arrowPath()` — shaft + arrowhead as a single SVG path |
| **Speech Bubble** | 💬 | `speechPath()` — rounded rect + tail triangle |
| **Text** (T) | T | `fabric.IText('Click to edit')` — double-click to enter editing mode |
| **Sticky Note** | 📌 | Two-object group: `fabric.Rect` (coloured bg) + `fabric.IText` |
| **Table** | ⊞ | N×M grid of `Rect` + `IText` pairs; header row has blue background; custom header labels |

### 8.3 Templates Panel

Two-step flow: **Pick template → Configure → Apply**

| Template | Configurable fields |
|---|---|
| **Blank Canvas** | Applied immediately — no config |
| **Kanban Board** | Select any combination of 7 column types (checkboxes); custom column name + colour picker |
| **Retrospective** | Three column heading labels (editable text inputs) |
| **Mind Map** | Central idea text + 4 branch topic names |
| **Brainstorm** | 4 idea box labels |

Each template is built dynamically from the user's choices via pure builder functions (`buildKanbanJSON`, `buildRetroJSON`, etc.) — no hard-coded JSON. Applying a template calls `engine.loadFromJSON()` which fully replaces the canvas.

**Kanban columns available:** To Do, In Progress, In Review, Blocked, Testing, Done, Custom (with name + colour picker)

### 8.4 Version History (`VersionPanel`)

- **Save now**: captures `engine.toJSON()` (full Fabric.js canvas JSON), POSTs to `/versions/:roomId` with an optional label → stored as a `Version` document in MongoDB
- **Version list**: fetched lazily when panel opens (React Query, `enabled: open`)
- **Restore**: sends `POST /versions/:roomId/:versionId/restore` → server re-saves that canvas data to the room; client shows toast "reload to see changes"
- Auto-save: `useWhiteboardCanvas` sends `draw:canvas_save` via socket every 30 seconds — server persists `canvasData` to the Room document

### 8.5 Export Panel

| Format | Implementation | Output |
|---|---|---|
| **PNG** | `canvas.toDataURL({ multiplier: 2 })` | 2× retina quality; `<a download>` trigger |
| **SVG** | `canvas.toSVG()` → `Blob` → `URL.createObjectURL` | Fully scalable vector |
| **PDF** | Lazy-loads jsPDF from CDN; renders PNG into PDF at canvas dimensions | Print-ready |
| **JSON** | `engine.toJSON()` → Blob download | Re-importable Fabric snapshot |

### 8.6 Session Analytics (`AnalyticsPanel`)

Listens to `draw:operation` socket events and accumulates:
- **Total Ops**: global counter incremented on every operation
- **Per-user ops**: keyed by `userId` — builds a leaderboard
- **Object count**: polled every 2 seconds from `canvas.getObjects().length`
- **Session duration**: `Date.now() - sessionStart` ticked every second

Displays: metric cards grid + top-5 contributor bar chart (with 🥇🥈🥉 medals).

### 8.7 Drawing Playback (`PlaybackPanel`)

Implements an **event-sourcing pattern**:

1. **Record**: captures `engine.toJSON()` as a snapshot at t=0; every subsequent `DrawOperation` is pushed to an in-memory log
2. **Replay**: restores canvas to t=0 snapshot, then applies each operation with a configurable delay (80ms / speed factor) via `engine.applyRemoteOperation(op)`
3. **Progress bar**: `(i+1)/ops.length * 100`
4. **Speeds**: 0.5×, 1×, 2×, 4×

Interview talking point: *"This is identical to how database Write-Ahead Logs (WAL) and Redux DevTools time-travel work."*

### 8.8 Laser Pointer (`LaserPointer`)

- Uses `socket.volatile.emit('laser:move', ...)` — **volatile** means if the socket buffer is full, this packet is silently dropped. This is intentional: a missed laser position is invisible to the user, but a missed draw operation would break the canvas.
- Remote dots are portalled to `document.body` with `createPortal` so they render above all other UI
- Dots auto-remove after 1.5s of no movement (cleanup timer per userId)
- CSS `transition: left 40ms linear, top 40ms linear` gives smooth movement

### 8.9 Comment Pins (`CommentPins`)

- **Pin placement**: while active, listens to `click` on the canvas container div (not the canvas element itself) — records `clientX - rect.left, clientY - rect.top` for position
- **Draft bubble**: small textarea appears at click position; Enter submits, Escape cancels
- **Sync**: `comment:add` / `comment:delete` events broadcast to all room members
- **Colours**: deterministic user colour from hash of `userId` — same user always gets the same colour
- Portalled to `document.body` — sits above canvas but below laser pointer (z-index 9998 vs 9999)

### 8.10 Activity Feed (`ActivityFeed`)

- Listens to `draw:operation`, `room:user_joined`, `room:user_left`, `activity:event`
- Local operations are also fed in via `localOps` prop from WhiteboardPage — deduped via `seenOps` Set to avoid double-counting
- Keeps last 100 events (`prev.slice(-99)`)
- Badge counter on button shows unread count (capped at 99)
- Displayed in reverse-chronological order (newest at top)

### 8.11 Real-Time Cursor Overlay (`CursorOverlay`)

- Each client emits `cursor:move { roomId, x, y }` on `mousemove` over the canvas container
- Server broadcasts to room peers
- Overlay div (z-index 20) renders a small labelled cursor div per remote user, positioned absolutely at their `x, y`
- Cursor colours derived from userId hash — consistent colour per person

### 8.12 Room Chat (`ChatSidebar`)

- Ephemeral: messages exist only in React state; not saved to MongoDB
- Optimistic: sender's message is appended immediately without waiting for server echo
- Auto-scrolls to newest message via `bottomRef.current?.scrollIntoView()`
- Enter key sends; Shift+Enter would add newline (standard chat UX)

### 8.13 Text Formatting (`TextFormatBar`)

Appears in the top bar only when a text object is the active selection. Controls:
- Font family (30+ fonts including Noto multilingual variants)
- Font size
- Bold / Italic / Underline toggles
- Text alignment (left / center / right)
- Text colour picker
- Language selector (for voice-to-text; also sets the font to the best match for that script)

### 8.14 Voice-to-Text (Mic Button)

- Uses the Web Speech API (`window.SpeechRecognition` / `window.webkitSpeechRecognition`)
- Falls back gracefully: alerts user if browser doesn't support it
- On transcript result: dispatches `CustomEvent('mic:transcript', { detail: text })` on `window`
- `useWhiteboardCanvas` listens for this event and either:
  - Inserts text at cursor position if an IText is in editing mode
  - Sets text of selected text object
  - Creates a new IText at canvas centre

### 8.15 Offline Mode

Full offline-first architecture — see [Section 9](#9-offline-first-architecture) for details.

### 8.16 Dark Mode (`useDarkMode`)

- Stores preference in `localStorage` (`theme` key)
- Applies/removes `dark` class on `<html>` element
- Tailwind's `dark:` variants handle all colour changes
- Respects `prefers-color-scheme` on first visit

### 8.17 Room Settings (`RoomSettingsModal`)

Available to room owners. Two tabs:

**General tab:**
- Rename the board
- Add/edit description
- Toggle Public (anyone with link can view) / Private (invite only)
- Copy invite link
- Regenerate invite link (invalidates all previous links)

**Members tab:**
- List all members with role badges
- Owner can change Editor ↔ Viewer roles via dropdown
- Owner can remove members (except themselves)
- Owner cannot be demoted via UI (protected)

---

## 9. Offline-First Architecture

```
                    ONLINE                         OFFLINE
                      │                              │
User draws ──────────►│ emitDrawOperation()          │
                      │ → socket.emit('draw:op')     │
                      │                              │
                      │                    User draws─►
                      │                   enqueueOperation()
                      │                   → IndexedDB.put(op)
                      │                              │
         Network restored ◄───────────────────────────
                      │
         window fires 'online'
                      │
         useOfflineSync() triggers
                      │
         getPendingOperations()    ← reads IndexedDB, sorted by queuedAt
                      │
         for each op:
           socket.emit('draw:operation', op)
           removeOperation(op.id)
           await 30ms             ← prevents server flooding
                      │
         All ops replayed in chronological order
```

**IndexedDB Schema:**
- Database: `whiteboard_offline` (v1)
- Object Store: `pending_ops` (keyPath: `id`)
- Value: `DrawOperation & { queuedAt: number }`

**Why this design is good** (interview answer):
> "It's an append-only, ordered queue — the same pattern used by Kafka and database WALs. We preserve operation order using the `queuedAt` timestamp. We never delete an operation until we get confirmation it was sent, preventing data loss even if the reconnection itself fails halfway through."

---

## 10. Security Design

### Authentication
- Passwords hashed with `bcryptjs` (saltRounds: 12)
- `accessToken`: signed JWT, 15-minute expiry, contains `{ userId, email }`
- `refreshToken`: signed JWT, 7-day expiry, stored in `User.refreshTokens[]` array (multiple devices supported)
- On logout: refreshToken removed from DB (token rotation)
- On 401: Axios interceptor silently refreshes and retries — invisible to user

### Authorisation (Role-Based Access Control)
| Role | Can draw | Can read | Can manage members | Can delete room |
|---|---|---|---|---|
| **Owner** | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ❌ | ❌ |
| **Viewer** | ❌ | ✅ | ❌ | ❌ |

Role is checked server-side on every REST endpoint and also validated in Socket.IO middleware before broadcasting draw operations.

### Other Security Measures
- `helmet` middleware: sets security headers (CSP, X-Frame-Options, etc.)
- `express-rate-limit`: rate-limits auth endpoints (login, register, refresh)
- CORS configured to allow only the frontend origin
- JWT signed with `RS256` (asymmetric) in production
- Invite tokens are `crypto.randomUUID()` — unpredictable, single-purpose

---

## 11. State Management Deep-Dive

### Three Zustand Stores

#### `authStore` (persisted)
```typescript
{
  user: User | null          // logged-in user profile
  accessToken: string | null // JWT for API calls
  refreshToken: string | null
  _hasHydrated: boolean      // prevents flash before localStorage rehydrates
}
```
Persisted to `localStorage` under key `wb_auth`. The `_hasHydrated` flag prevents the protected route from redirecting before the token is loaded.

#### `canvasStore` (in-memory)
```typescript
{
  activeTool: Tool            // currently selected tool
  strokeColor, fillColor      // drawing colours
  strokeWidth, opacity        // drawing properties
  fontFamily, fontSize, ...   // text formatting
  stickyColor                 // sticky note colour
  tableRows, tableCols        // table dimensions
  tableHeaders: string[]      // column header labels
  canUndo, canRedo            // undo/redo button state
}
```
Single source of truth for all toolbar state. The `CanvasEngine` reads this store on every `addShape()` call.

#### `roomStore` (in-memory)
```typescript
{
  activeRoom: Room | null      // current room data
  onlineUsers: OnlineUser[]    // users currently in the room
  cursors: Record<userId, CursorPosition>  // live cursor positions
}
```

### React Query
Used for all server state:
- `['rooms']` — dashboard room list
- `['room', roomId]` — current room details
- `['versions', roomId]` — version history (fetched lazily)
- Mutations for create/delete room, save/restore version, change role, remove member

---

## 12. Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `V` | Select tool |
| `P` | Pencil tool |
| `E` | Eraser |
| `T` | Text tool |
| `H` | Pan tool |
| `R` | Rectangle |
| `C` | Circle |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Delete` / `Backspace` | Delete selected object(s) |
| `Ctrl+C` | Copy |
| `Ctrl+X` | Cut |
| `Ctrl+V` | Paste |
| `Ctrl+S` | Save version snapshot |
| `Ctrl+B` | Bold (text) |
| `Ctrl+I` | Italic (text) |
| `Ctrl+U` | Underline (text) |
| `Scroll wheel` | Zoom in/out |
| `Middle-click drag` | Pan canvas |
| `Ctrl+Shift+H` | Reset zoom |
| `?` | Show/hide keyboard shortcuts |
| `Escape` | Deselect / close modals |

---

## 13. API Reference

**Base URL:** `http://localhost:4000/api`  
**Auth header:** `Authorization: Bearer <accessToken>`

### Auth Endpoints

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` | `{ accessToken, refreshToken, user }` | Creates account |
| POST | `/auth/login` | `{ email, password }` | `{ accessToken, refreshToken, user }` | Returns tokens |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ accessToken }` | Silent token rotation |
| POST | `/auth/logout` | `{ refreshToken }` | 204 | Removes token from DB |
| GET | `/auth/google` | — | redirect | OAuth2 start |
| GET | `/auth/google/callback` | — | redirect | OAuth2 finish |

### User Endpoints

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/users/me` 🔒 | — | Own profile |
| PATCH | `/users/me` 🔒 | `{ name?, avatar? }` | Update profile |

### Room Endpoints

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/rooms` 🔒 | — | All rooms I'm in |
| POST | `/rooms` 🔒 | `{ name, description?, isPublic? }` | Create room (creator = owner) |
| GET | `/rooms/:id` 🔒 | — | Room detail + members + canvas |
| DELETE | `/rooms/:id` 🔒 | — | Owner only |
| PATCH | `/rooms/:id/canvas` 🔒 | `{ canvasData }` | Persist canvas JSON (editor+) |
| PATCH | `/rooms/:id/settings` 🔒 | `{ name, description, isPublic }` | Owner only |
| PATCH | `/rooms/:id/members/:memberId` 🔒 | `{ role }` | Change role (owner) |
| DELETE | `/rooms/:id/members/:memberId` 🔒 | — | Remove member (owner) |
| POST | `/rooms/join/:inviteToken` 🔒 | — | Join via invite link |
| POST | `/rooms/:id/regenerate-invite` 🔒 | — | New token, old ones invalidated |

### Version Endpoints

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/versions/:roomId` 🔒 | — | List all versions for room |
| POST | `/versions/:roomId` 🔒 | `{ label, canvasData }` | Save snapshot |
| POST | `/versions/:roomId/:versionId/restore` 🔒 | — | Restore to version |

---

## 14. Interview Q&A — How to Talk About This Project

### "Tell me about this project."
> "I built a real-time collaborative whiteboard — similar to Miro — from the ground up. It lets multiple users draw simultaneously on a shared canvas. I used React with Fabric.js for the canvas, Socket.IO for real-time sync, MongoDB for persistence, and Redis for scaling the Socket.IO server across multiple instances. I also implemented an offline mode using IndexedDB so users can keep drawing when they lose internet, and the strokes replay in order when they reconnect."

### "How does real-time sync work?"
> "Every canvas mutation — adding a shape, moving it, deleting it — generates a `DrawOperation` object. This gets emitted over a WebSocket to the server, which broadcasts it to all other users in the same room. On the receiving end, each client applies the operation to their own Fabric.js canvas. The operation format is simple: it includes the type (add/modify/remove), the object's serialised JSON, and a vector clock for conflict detection."

### "How do you handle conflicts when two users edit the same object simultaneously?"
> "I use vector clocks, which is the same approach Amazon Dynamo uses. Each operation carries a clock that increments per user. When we detect concurrent edits — where neither clock strictly dominates — we apply last-write-wins based on server arrival order. This is good enough for a whiteboard where users are generally working in different areas of the canvas."

### "How does the offline mode work?"
> "When the user is offline, instead of dropping operations, I write them to an IndexedDB object store using the `idb` library. Each op is timestamped with `queuedAt`. When the browser fires the `online` event, a `useOfflineSync` hook reads the IndexedDB queue, sorts by timestamp, and replays each operation through the socket with a 30ms delay between them to avoid flooding the server. It's essentially an append-only write-ahead log."

### "Why Fabric.js instead of a raw Canvas API?"
> "Fabric.js gives me object-level abstraction over the Canvas API — each shape is a Fabric object with transform handles, serialisation to JSON, and event hooks for selection/modification. Writing that from scratch would take weeks. It also handles the undo/redo state I need because I can serialize and deserialize the entire canvas state with one call."

### "How does version history work?"
> "Every 30 seconds, the client emits a `draw:canvas_save` event with the full canvas JSON, which the server persists to the Room document in MongoDB. Users can also manually save named snapshots — these are stored as separate `Version` documents with a version number, label, and the canvas JSON at that point. Restoring a version sends that canvas JSON back to the client, which calls `loadFromJSON()` to replace the current state."

### "How did you scale Socket.IO across multiple server instances?"
> "I used the Socket.IO Redis adapter. When you have multiple Node.js instances (e.g. behind a load balancer), each instance has its own in-memory Socket.IO rooms. The Redis adapter uses Redis pub/sub so when one instance broadcasts to a room, Redis fans it out to all other instances, which then deliver it to their connected clients. This makes the system stateless and horizontally scalable."

### "What would you do differently if building this again?"
> "I'd use CRDT (Conflict-free Replicated Data Types) instead of vector clocks + last-write-wins — CRDTs are mathematically guaranteed to converge without any server arbitration. Libraries like Yjs or Automerge are designed exactly for this. I'd also consider an event-sourced database like EventStore instead of storing only the latest canvas snapshot — that would make version history trivially correct and free."

### "What patterns did you use?"
> "A few notable ones:
> - **Event Sourcing** in the Playback Recorder — all mutations are an append-only log, replayed deterministically
> - **Optimistic UI** in the chat — my own messages appear instantly without waiting for a server echo
> - **Command pattern** in DrawOperation — each operation is a serialisable command that can be transmitted, stored, and replayed
> - **Observer / pub-sub** for the Activity Feed — Socket.IO is the broker, all components subscribe to events they care about
> - **Offline-first** with a local queue that acts as a WAL"

---

## 15. Folder Structure

```
realtime-whiteboard/
│
├── client/                          ← React frontend
│   ├── public/
│   ├── src/
│   │   ├── App.tsx                  ← Route definitions + auth guard
│   │   ├── main.tsx                 ← React DOM root, Providers
│   │   ├── index.css                ← Tailwind base + custom classes
│   │   ├── config.ts                ← API/socket URL config
│   │   ├── vite-env.d.ts
│   │   │
│   │   ├── canvas/
│   │   │   └── CanvasEngine.ts      ← Fabric.js wrapper — THE core of the app
│   │   │
│   │   ├── components/
│   │   │   ├── ActivityFeed.tsx     ← Real-time audit log
│   │   │   ├── AnalyticsPanel.tsx   ← Session stats & leaderboard
│   │   │   ├── CanvasContextMenu.tsx← Right-click menu (copy/cut/paste/delete)
│   │   │   ├── ChatSidebar.tsx      ← Ephemeral room chat
│   │   │   ├── CommentPins.tsx      ← Anchored canvas comments
│   │   │   ├── CursorOverlay.tsx    ← Remote user cursor labels
│   │   │   ├── ExportPanel.tsx      ← PNG/SVG/PDF/JSON export
│   │   │   ├── KeyboardShortcuts.tsx← Shortcut cheat-sheet modal
│   │   │   ├── LaserPointer.tsx     ← Presenter broadcast cursor
│   │   │   ├── OfflineBadge.tsx     ← "You are offline" indicator
│   │   │   ├── PlaybackPanel.tsx    ← Record & replay drawing session
│   │   │   ├── RoomSettingsModal.tsx← Owner: rename, visibility, members
│   │   │   ├── TemplatesPanel.tsx   ← Kanban/Retro/MindMap/Brainstorm
│   │   │   ├── TextFormatBar.tsx    ← Rich text formatting toolbar
│   │   │   ├── Toolbar.tsx          ← Left sidebar — all drawing tools
│   │   │   ├── UserList.tsx         ← Online collaborators avatars
│   │   │   └── VersionPanel.tsx     ← Snapshot history & restore
│   │   │
│   │   ├── hooks/
│   │   │   ├── useDarkMode.ts       ← Dark/light mode persistence
│   │   │   ├── useNetworkStatus.ts  ← navigator.onLine wrapper
│   │   │   ├── useOfflineSync.ts    ← IndexedDB queue drain on reconnect
│   │   │   └── useWhiteboardCanvas.ts ← Canvas lifecycle + socket routing
│   │   │
│   │   ├── offline/
│   │   │   └── queue.ts             ← IndexedDB read/write/delete helpers
│   │   │
│   │   ├── pages/
│   │   │   ├── AdminPage.tsx        ← User management, system stats
│   │   │   ├── DashboardPage.tsx    ← My boards grid
│   │   │   ├── ForgotPasswordPage.tsx
│   │   │   ├── JoinRoomPage.tsx     ← Accept invite token
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OAuthCallbackPage.tsx← Google OAuth redirect handler
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── RoleSelectorPage.tsx ← Entry point / role picker
│   │   │   ├── UserProfilePage.tsx
│   │   │   └── WhiteboardPage.tsx   ← Main canvas page — assembles everything
│   │   │
│   │   ├── services/
│   │   │   ├── api.ts               ← Axios instance + JWT interceptors
│   │   │   └── socket.ts            ← Socket.IO singleton + typed emitters
│   │   │
│   │   ├── store/
│   │   │   ├── authStore.ts         ← User + tokens (persisted)
│   │   │   ├── canvasStore.ts       ← Tool settings + table config
│   │   │   └── roomStore.ts         ← Active room + online users + cursors
│   │   │
│   │   └── types/
│   │       └── index.ts             ← Shared TypeScript interfaces
│   │
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── server/                          ← Node.js backend
│   ├── src/
│   │   ├── index.ts                 ← Express + Socket.IO bootstrap
│   │   ├── config/                  ← DB/Redis/JWT config
│   │   ├── controllers/             ← Route handlers
│   │   ├── middleware/              ← Auth guard, role check, rate-limit
│   │   ├── models/                  ← Mongoose: User, Room, Version
│   │   ├── routes/                  ← Express routers
│   │   ├── socket/                  ← Socket.IO event handlers
│   │   ├── services/                ← Business logic
│   │   ├── utils/                   ← Logger, helpers
│   │   └── tests/                   ← Jest test suites
│   ├── .env.example
│   ├── API.md                       ← REST endpoint reference
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml               ← Local dev: client + server + mongo + redis
├── README.md
├── DEPLOY.md
└── PROJECT_DOCUMENTATION.md        ← This file
```

---

*CollabBoard — Final-Year Engineering Portfolio Project*  
*Full-Stack: React · TypeScript · Node.js · Socket.IO · MongoDB · Redis · Fabric.js*
