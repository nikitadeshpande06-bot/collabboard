// Shared TypeScript types used across the frontend

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
}

export type RoomRole = 'owner' | 'editor' | 'viewer';

export interface RoomMember {
  user: User;
  role: RoomRole;
  joinedAt: string;
}

export interface Room {
  _id: string;
  name: string;
  description?: string;
  canvasData: string;
  members: RoomMember[];
  inviteToken: string;
  isPublic: boolean;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  _id: string;
  room: string;
  createdBy: User;
  canvasData?: string;
  label: string;
  versionNumber: number;
  createdAt: string;
}

// ── Socket operation types ────────────────────────────────────────────────────

export type OperationType = 'add' | 'modify' | 'remove' | 'clear';

export interface DrawOperation {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  type: OperationType;
  objectId?: string;
  data: unknown;
  timestamp: number;
  vectorClock: Record<string, number>;
}

export interface CursorPosition {
  roomId: string;
  userId: string;
  userName: string;
  x: number;
  y: number;
}

export interface OnlineUser {
  userId: string;
  userName: string;
  socketId: string;
}
