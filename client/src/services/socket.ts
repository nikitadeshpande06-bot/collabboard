import { io, Socket } from 'socket.io-client';
import { CONFIG } from '@/config';
import type { DrawOperation, CursorPosition } from '@/types';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function initSocket(token: string): Socket {
  // Return existing socket if it exists (connected or still connecting)
  if (socket) return socket;

  socket = io(CONFIG.socket_url, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => console.info('[Socket] Connected', socket!.id));
  socket.on('disconnect', (reason) => console.warn('[Socket] Disconnected', reason));
  socket.on('connect_error', (err) => console.error('[Socket] Error', err.message));

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

// ── Typed emitters ────────────────────────────────────────────────────────────

export function joinRoom(roomId: string): void {
  getSocket()?.emit('room:join', { roomId });
}

export function leaveRoom(roomId: string): void {
  getSocket()?.emit('room:leave', { roomId });
}

export function emitDrawOperation(op: DrawOperation): void {
  getSocket()?.emit('draw:operation', op);
}

export function emitCanvasSave(roomId: string, canvasData: string): void {
  getSocket()?.emit('draw:canvas_save', { roomId, canvasData });
}

export function emitCursorMove(pos: Omit<CursorPosition, 'userId' | 'userName'>): void {
  getSocket()?.emit('cursor:move', pos);
}
