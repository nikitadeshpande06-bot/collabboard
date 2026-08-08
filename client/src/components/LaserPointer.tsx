/**
 * LaserPointer
 *
 * Presenter mode: when active, your mouse movements broadcast a red glowing
 * dot visible to all collaborators in real time — without affecting the canvas.
 *
 * Resume talking point:
 *  "Added an ephemeral real-time layer using Socket.IO's volatile emit pattern
 *   so laser pointer packets are dropped gracefully under congestion, never
 *   blocking the draw operation pipeline."
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Socket } from 'socket.io-client';

interface LaserDot {
  userId:   string;
  userName: string;
  x:        number;
  y:        number;
}

interface Props {
  roomId:             string;
  socket:             Socket | null;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
}

export default function LaserPointer({ roomId, socket, canvasContainerRef }: Props) {
  const [active, setActive]   = useState(false);
  const [dots,   setDots]     = useState<Record<string, LaserDot>>({});
  const timeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Block canvas interaction while laser is active ───────────────────────────
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    // The upper-canvas is what fabric attaches pointer events to
    const upperCanvas = el.querySelector<HTMLElement>('.upper-canvas');
    if (upperCanvas) {
      upperCanvas.style.pointerEvents = active ? 'none' : '';
    }
  }, [active, canvasContainerRef]);

  // ── Broadcast own laser position ─────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      socket?.emit('laser:stop', { roomId });
      return;
    }
    const el = canvasContainerRef.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      socket?.volatile.emit('laser:move', {
        roomId,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };
    el.addEventListener('mousemove', handler);
    return () => {
      el.removeEventListener('mousemove', handler);
      socket?.emit('laser:stop', { roomId });
    };
  }, [active, roomId, socket, canvasContainerRef]);

  // ── Receive remote laser positions ───────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onMove = (d: LaserDot) => {
      setDots((prev) => ({ ...prev, [d.userId]: d }));
      // Auto-remove dot after 1.5 s of no movement
      clearTimeout(timeouts.current[d.userId]);
      timeouts.current[d.userId] = setTimeout(() => {
        setDots((prev) => { const n = { ...prev }; delete n[d.userId]; return n; });
      }, 1500);
    };

    const onStop = ({ userId }: { userId: string }) => {
      clearTimeout(timeouts.current[userId]);
      setDots((prev) => { const n = { ...prev }; delete n[userId]; return n; });
    };

    socket.on('laser:move', onMove);
    socket.on('laser:stop', onStop);
    return () => {
      socket.off('laser:move', onMove);
      socket.off('laser:stop', onStop);
    };
  }, [socket]);

  // Get the canvas container bounds for positioning dots
  const containerRect = canvasContainerRef.current?.getBoundingClientRect();

  return (
    <>
      {/* Toolbar toggle button */}
      <button
        title={active ? 'Laser pointer ON — click to turn off' : 'Laser pointer'}
        onClick={() => setActive((p) => !p)}
        className={`btn-ghost text-sm ${active ? 'text-red-600 bg-red-50' : ''}`}
      >
        🔴 {active ? 'Laser ON' : 'Laser'}
      </button>

      {/* Remote laser dots — portalled to body so they sit above everything */}
      {Object.keys(dots).length > 0 && createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          {Object.values(dots).map((d) => (
            <div
              key={d.userId}
              className="absolute"
              style={{
                left: (containerRect?.left ?? 0) + d.x - 10,
                top:  (containerRect?.top  ?? 0) + d.y - 10,
                transition: 'left 40ms linear, top 40ms linear',
              }}
            >
              <div className="w-5 h-5 rounded-full bg-red-500 opacity-80 shadow-[0_0_12px_4px_rgba(239,68,68,0.6)]" />
              <div className="absolute left-6 top-0 bg-red-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap shadow">
                {d.userName}
              </div>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
