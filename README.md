# 🖌️ Real-Time Collaborative Whiteboard

A production-quality, full-stack collaborative whiteboard application with real-time sync, offline support, and version history — built as a final-year engineering portfolio project.

---

## ✨ Features

| Category | Details |
|---|---|
| **Real-Time Collaboration** | Multiple users draw/write simultaneously via WebSockets (Socket.IO) |
| **Canvas Tools** | Pencil, Shapes, Text, Sticky Notes, Eraser, Image Upload, Pan/Zoom |
| **Authentication** | JWT-based auth with refresh tokens |
| **Rooms & Permissions** | Create rooms, invite via links, Role: Owner / Editor / Viewer |
| **Offline Support** | IndexedDB queues operations; auto-syncs on reconnect |
| **Version History** | Browse, compare, restore snapshots; undo/redo per session |
| **Conflict Resolution** | Operational-Transform-inspired last-write-wins with vector clocks |
| **Scalable Architecture** | Stateless backend + Redis pub/sub for multi-instance Socket.IO |
| **Containerised** | Docker Compose for local dev; production-ready Dockerfiles |
| **CI/CD** | GitHub Actions pipeline (lint → test → build → deploy) |

---

## 🏗️ Technology Stack

**Frontend:** React 18 + TypeScript + Tailwind CSS + Fabric.js + Zustand + React Query  
**Backend:** Node.js + Express.js + Socket.IO + MongoDB (Mongoose) + Redis  
**Auth:** JWT (access + refresh tokens), bcrypt  
**Infra:** Docker, Docker Compose, GitHub Actions, Vercel (frontend), Render (backend)

---

## 📁 Folder Structure

```
realtime-whiteboard/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route-level pages
│   │   ├── canvas/          # Fabric.js canvas logic
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Zustand global state
│   │   ├── services/        # API + Socket clients
│   │   ├── offline/         # IndexedDB helpers
│   │   └── types/           # Shared TypeScript types
│   └── ...
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   ├── middleware/       # Auth, validation, rate-limit
│   │   ├── socket/          # Socket.IO event handlers
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helpers, logger
│   └── ...
├── docker-compose.yml
├── .github/workflows/       # CI/CD pipelines
└── README.md
```

---

## 🚀 Quick Start (Local Dev)

```bash
# 1. Clone
git clone https://github.com/your-username/realtime-whiteboard.git
cd realtime-whiteboard

# 2. Environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env

# 3. Start everything with Docker Compose
docker-compose up --build

# OR run manually:
# Terminal 1 — backend
cd server && npm install && npm run dev

# Terminal 2 — frontend
cd client && npm install && npm run dev
```

**App:** http://localhost:5173  
**API:** http://localhost:4000/api  
**Socket:** ws://localhost:4000

---

## 🧪 Testing

```bash
# Backend unit + integration tests
cd server && npm test

# Frontend component tests
cd client && npm test
```

---

## 🐳 Docker

```bash
docker-compose up --build          # dev
docker-compose -f docker-compose.prod.yml up --build   # prod
```

---

## 📖 API Documentation

See [`server/API.md`](server/API.md) for full REST endpoint reference.

---

## 🎓 Resume Description

> Built a real-time collaborative whiteboard SaaS using React, TypeScript, Node.js, Socket.IO, MongoDB, and Redis. Implemented offline-first architecture with IndexedDB-based operation queuing, conflict resolution via vector clocks, and a full version-history system. Containerised with Docker and deployed via CI/CD pipeline on Vercel and Render.

---

## 🔮 Future Scope

- AI-assisted drawing suggestions (Stable Diffusion API)
- Video/voice chat integration (WebRTC)
- Mobile app (React Native)
- Whiteboard templates marketplace
- Plugin system for third-party integrations

---

*Made with ❤️ as a Final-Year Engineering Portfolio Project*
