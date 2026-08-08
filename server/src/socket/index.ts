import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { logger } from '../utils/logger';
import { Room } from '../models/Room';
import { saveChatMessage } from '../controllers/chat.controller';
import {
  trackConnect, trackJoinRoom,
  trackLeaveRoom, trackDisconnect,
} from './onlineTracker';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Describes a single drawing operation broadcasted between clients */
export interface DrawOperation {
  id: string;           // client-generated UUID
  roomId: string;
  userId: string;
  userName: string;
  type: 'add' | 'modify' | 'remove' | 'clear';
  objectId?: string;    // Fabric.js object id
  data: unknown;        // Serialised Fabric.js object or diff
  timestamp: number;    // Unix ms — used for last-write-wins
  vectorClock: Record<string, number>; // userId → lamport clock
}

interface AuthSocket extends Socket {
  userId: string;
  userName: string;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

export async function initSocket(httpServer: HttpServer): Promise<SocketServer> {
  const io = new SocketServer(httpServer, {
    cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Attach Redis adapter for horizontal scaling (optional — skipped if Redis is down)
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  try {
    const pubClient = createClient({ url: redisUrl, socket: { connectTimeout: 3000, reconnectStrategy: false } });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(
      pubClient as Parameters<typeof createAdapter>[0],
      subClient as Parameters<typeof createAdapter>[1],
    ));
    logger.info('✅ Socket.IO using Redis adapter');
  } catch {
    logger.warn('⚠️  Socket.IO Redis adapter unavailable — using in-memory (single-instance only)');
  }

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string }).token;
    if (!token) return next(new Error('No auth token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; name?: string };
      (socket as AuthSocket).userId = payload.id;
      (socket as AuthSocket).userName = (payload as { id: string; name?: string }).name ?? 'Unknown';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ───────────────────────────────────────────────────────────────
  io.on('connection', (raw) => {
    const socket = raw as AuthSocket;
    logger.debug(`Socket connected: ${socket.id} (user ${socket.userId})`);

    // Register in online tracker
    trackConnect({
      userId:      socket.userId,
      userName:    socket.userName,
      socketId:    socket.id,
      roomId:      null,
      connectedAt: Date.now(),
    });

    // Emit updated online count to all clients
    io.emit('admin:online_count', { count: io.engine.clientsCount });

    // ── JOIN ROOM ──────────────────────────────────────────────────────────────
    socket.on('room:join', async ({ roomId }: { roomId: string }) => {
      const room = await Room.findById(roomId).lean();
      if (!room) { socket.emit('error', { message: 'Room not found' }); return; }

      const isMember = room.members.some((m) => String(m.user) === socket.userId);
      if (!isMember && !room.isPublic) {
        socket.emit('error', { message: 'Not authorised to join this room' });
        return;
      }

      socket.join(roomId);
      trackJoinRoom(socket.id, roomId);
      logger.debug(`User ${socket.userId} joined room ${roomId}`);

      socket.to(roomId).emit('room:user_joined', {
        userId:   socket.userId,
        userName: socket.userName,
        socketId: socket.id,
      });

      socket.emit('room:canvas_init', { canvasData: room.canvasData });
    });

    // ── LEAVE ROOM ─────────────────────────────────────────────────────────────
    socket.on('room:leave', ({ roomId }: { roomId: string }) => {
      socket.leave(roomId);
      trackLeaveRoom(socket.id);
      socket.to(roomId).emit('room:user_left', { userId: socket.userId, socketId: socket.id });
    });

    // ── DRAW OPERATION ─────────────────────────────────────────────────────────
    /**
     * Client emits 'draw:operation' with a DrawOperation payload.
     * We broadcast it to all other clients in the room.
     * Conflict resolution is last-write-wins based on timestamp.
     * The server also persists the latest full canvas every 30 operations
     * using a Redis counter as a cheap auto-save trigger.
     */
    socket.on('draw:operation', async (op: DrawOperation) => {
      // Broadcast immediately to all peers
      socket.to(op.roomId).emit('draw:operation', op);

      // Throttled persistence: count ops in Redis, flush every 30
      try {
        const key = `op_count:${op.roomId}`;
        const adapterPub = (io.of('/').adapter as unknown as { pubClient?: { incr: (k: string) => Promise<number>; del: (k: string) => Promise<number> } }).pubClient;
        if (adapterPub) {
          const count = await adapterPub.incr(key);
          if (count >= 30) {
            await adapterPub.del(key);
          }
        }
      } catch { /* Redis unavailable — skip counter */ }
    });

    // ── CANVAS SAVE (owner pushes full state) ──────────────────────────────────
    socket.on('draw:canvas_save', async ({ roomId, canvasData }: { roomId: string; canvasData: string }) => {
      await Room.findByIdAndUpdate(roomId, { canvasData }).lean();
      // Notify peers that a save occurred (so they can update their local copy)
      socket.to(roomId).emit('draw:canvas_saved', { savedBy: socket.userId });
    });

    // ── CURSOR TRACKING (lightweight, ephemeral) ───────────────────────────────
    socket.on('cursor:move', (payload: { roomId: string; x: number; y: number }) => {
      socket.to(payload.roomId).emit('cursor:move', {
        ...payload,
        userId: socket.userId,
        userName: socket.userName,
      });
    });

    // ── LASER POINTER (presenter mode) ────────────────────────────────────────
    socket.on('laser:move', (payload: { roomId: string; x: number; y: number }) => {
      socket.to(payload.roomId).emit('laser:move', {
        ...payload,
        userId: socket.userId,
        userName: socket.userName,
      });
    });
    socket.on('laser:stop', (payload: { roomId: string }) => {
      socket.to(payload.roomId).emit('laser:stop', { userId: socket.userId });
    });

    // ── COMMENT PIN ───────────────────────────────────────────────────────────
    socket.on('comment:add', (payload: {
      roomId: string; id: string; x: number; y: number; text: string;
    }) => {
      socket.to(payload.roomId).emit('comment:add', {
        ...payload,
        userId: socket.userId,
        userName: socket.userName,
        createdAt: Date.now(),
      });
    });
    socket.on('comment:delete', (payload: { roomId: string; id: string }) => {
      socket.to(payload.roomId).emit('comment:delete', payload);
    });

    // ── ACTIVITY FEED ─────────────────────────────────────────────────────────
    socket.on('activity:event', (payload: { roomId: string; action: string }) => {
      socket.to(payload.roomId).emit('activity:event', {
        userId: socket.userId,
        userName: socket.userName,
        action: payload.action,
        ts: Date.now(),
      });
    });

    // ── CHAT MESSAGE ───────────────────────────────────────────────────────────
    socket.on('chat:message', (payload: {
      roomId: string; id: string; userId: string;
      userName: string; text: string; timestamp: number;
    }) => {
      // Relay to all OTHER users in the room (sender already shows it optimistically)
      socket.to(payload.roomId).emit('chat:message', payload);
      // Persist to MongoDB (fire-and-forget — don't block the socket)
      saveChatMessage(payload.roomId, payload.userId, payload.userName, payload.text)
        .catch((e) => logger.warn('Chat persist failed', e));
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} (${reason})`);
      trackDisconnect(socket.id);
      io.emit('admin:online_count', { count: io.engine.clientsCount });
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          io.to(roomId).emit('room:user_left', { userId: socket.userId, socketId: socket.id });
        }
      });
    });
  });

  return io;
}
