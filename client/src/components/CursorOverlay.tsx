/**
 * Live Cursor Overlay
 *
 * Renders floating name tags + cursor dots for every collaborator
 * currently in the same room. Updates in real-time via Socket.IO.
 *
 * Why this impresses interviewers:
 *  – Shows you understand real-time UX, not just data sync
 *  – Demonstrates CSS positioning + React state coordination
 *  – Identical to Figma / Notion's presence system
 */
import { useEffect } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { useAuthStore } from '@/store/authStore';
import { emitCursorMove } from '@/services/socket';
import type { Socket } from 'socket.io-client';

// One stable colour per userId (derived from string hash)
function userColor(userId: string): string {
  const palette = [
    '#ef4444','#f97316','#eab308','#22c55e',
    '#3b82f6','#8b5cf6','#ec4899','#06b6d4',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

interface Props {
  roomId: string;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  socket: Socket | null;
}

export default function CursorOverlay({ roomId, canvasContainerRef, socket }: Props) {
  const { cursors, updateCursor } = useRoomStore();
  const { user } = useAuthStore();

  // Broadcast my cursor position on every mouse move over the canvas
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      emitCursorMove({
        roomId,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    el.addEventListener('mousemove', handler);
    return () => el.removeEventListener('mousemove', handler);
  }, [roomId, canvasContainerRef]);

  // Listen for remote cursors
  useEffect(() => {
    if (!socket) return;
    socket.on('cursor:move', (c) => {
      if (c.userId !== user?._id) updateCursor(c);
    });
    return () => { socket.off('cursor:move'); };
  }, [user?._id, updateCursor]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {Object.values(cursors).map((c) => {
        if (c.userId === user?._id) return null;
        const color = userColor(c.userId);
        return (
          <div
            key={c.userId}
            className="absolute transition-all duration-75"
            style={{ left: c.x, top: c.y }}
          >
            {/* Cursor dot */}
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ color }}>
              <path d="M0 0 L10 14 L5 9 L0 0" fill="currentColor" stroke="white" strokeWidth="1"/>
            </svg>
            {/* Name tag */}
            <div
              className="absolute top-4 left-2 text-white text-xs font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap shadow-sm"
              style={{ background: color, fontSize: 11 }}
            >
              {c.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
}
