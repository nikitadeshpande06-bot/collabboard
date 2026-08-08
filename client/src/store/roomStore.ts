import { create } from 'zustand';
import type { Room, OnlineUser, CursorPosition } from '@/types';

interface RoomState {
  activeRoom: Room | null;
  onlineUsers: OnlineUser[];
  cursors: Record<string, CursorPosition>;
  setActiveRoom: (room: Room) => void;
  addOnlineUser: (u: OnlineUser) => void;
  removeOnlineUser: (socketId: string) => void;
  updateCursor: (c: CursorPosition) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  activeRoom: null,
  onlineUsers: [],
  cursors: {},

  setActiveRoom: (room) => set({ activeRoom: room }),

  addOnlineUser: (u) =>
    set((s) => ({
      onlineUsers: [...s.onlineUsers.filter((x) => x.socketId !== u.socketId), u],
    })),

  removeOnlineUser: (socketId) =>
    set((s) => ({
      onlineUsers: s.onlineUsers.filter((x) => x.socketId !== socketId),
    })),

  updateCursor: (c) =>
    set((s) => ({ cursors: { ...s.cursors, [c.userId]: c } })),
}));
