/**
 * onlineTracker.ts
 *
 * A lightweight in-memory registry of who is currently connected via Socket.IO.
 * Updated by the socket server on every join/leave/disconnect event.
 *
 * Exported so the admin controller can query it without coupling to the socket instance.
 */

export interface OnlineEntry {
  userId:    string;
  userName:  string;
  email?:    string;
  socketId:  string;
  roomId:    string | null;
  connectedAt: number; // Unix ms
}

const registry = new Map<string, OnlineEntry>(); // key = socketId

export function trackConnect(entry: OnlineEntry): void {
  registry.set(entry.socketId, entry);
}

export function trackJoinRoom(socketId: string, roomId: string): void {
  const entry = registry.get(socketId);
  if (entry) registry.set(socketId, { ...entry, roomId });
}

export function trackLeaveRoom(socketId: string): void {
  const entry = registry.get(socketId);
  if (entry) registry.set(socketId, { ...entry, roomId: null });
}

export function trackDisconnect(socketId: string): void {
  registry.delete(socketId);
}

export function getOnlineUsers(): OnlineEntry[] {
  return Array.from(registry.values());
}

export function getOnlineCount(): number {
  return registry.size;
}
