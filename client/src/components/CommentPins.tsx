/**
 * CommentPins
 *
 * Click anywhere on the canvas to drop an anchored comment pin — visible to all
 * collaborators in real time. Pins persist for the session and sync via Socket.IO.
 *
 * Resume talking point:
 *  "Built a collaborative annotation layer on top of the canvas using a
 *   separate socket event stream — keeping comment state decoupled from the
 *   drawing state, which mirrors how Figma separates comments from designs."
 */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/authStore';
import type { Socket } from 'socket.io-client';

interface CommentPin {
  id:        string;
  x:         number;
  y:         number;
  text:      string;
  userId:    string;
  userName:  string;
  createdAt: number;
}

interface Props {
  roomId:             string;
  socket:             Socket | null;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
}

export default function CommentPins({ roomId, socket, canvasContainerRef }: Props) {
  const { user } = useAuthStore();
  const [active,    setActive]    = useState(false);
  const [pins,      setPins]      = useState<CommentPin[]>([]);
  const [drafting,  setDrafting]  = useState<{ x: number; y: number } | null>(null);
  const [draftText, setDraftText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── Canvas click → open draft bubble ─────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    const el = canvasContainerRef.current;
    if (!el) return;

    const handler = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      setDrafting({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDraftText('');
      setTimeout(() => inputRef.current?.focus(), 50);
    };
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, [active, canvasContainerRef]);

  // ── Submit draft ─────────────────────────────────────────────────────────────
  function submitPin() {
    if (!drafting || !draftText.trim() || !user) return;
    const pin: CommentPin = {
      id:        crypto.randomUUID(),
      x:         drafting.x,
      y:         drafting.y,
      text:      draftText.trim(),
      userId:    user._id,
      userName:  user.name,
      createdAt: Date.now(),
    };
    setPins((p) => [...p, pin]);
    socket?.emit('comment:add', { roomId, ...pin });
    setDrafting(null);
    setDraftText('');
    setActive(false);
  }

  // ── Receive remote pins ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const onAdd    = (pin: CommentPin)            => setPins((p) => [...p.filter((x) => x.id !== pin.id), pin]);
    const onDelete = ({ id }: { id: string })      => setPins((p) => p.filter((x) => x.id !== id));
    socket.on('comment:add',    onAdd);
    socket.on('comment:delete', onDelete);
    return () => {
      socket.off('comment:add',    onAdd);
      socket.off('comment:delete', onDelete);
    };
  }, [socket]);

  function deletePin(id: string) {
    setPins((p) => p.filter((x) => x.id !== id));
    socket?.emit('comment:delete', { roomId, id });
  }

  const pinColors = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6'];
  const userColor = (uid: string) => pinColors[Math.abs([...uid].reduce((a, c) => a + c.charCodeAt(0), 0)) % pinColors.length];

  const containerRect = canvasContainerRef.current?.getBoundingClientRect();
  const offsetX = containerRect?.left ?? 0;
  const offsetY = containerRect?.top  ?? 0;

  return (
    <>
      {/* Toolbar button */}
      <button
        title={active ? 'Click canvas to place comment (active)' : 'Add comment pin'}
        onClick={() => { setActive((p) => !p); setDrafting(null); }}
        className={`btn-ghost text-sm ${active ? 'bg-yellow-50 text-yellow-700' : ''}`}
      >
        💬 {active ? 'Click to pin' : `Comments${pins.length > 0 ? ` (${pins.length})` : ''}`}
      </button>

      {/* Overlay portalled to body */}
      {createPortal(
        <div className="fixed inset-0 pointer-events-none z-[9998]">

          {/* Existing pins */}
          {pins.map((pin) => (
            <PinBubble
              key={pin.id}
              pin={pin}
              x={offsetX + pin.x}
              y={offsetY + pin.y}
              color={userColor(pin.userId)}
              isOwn={pin.userId === user?._id}
              onDelete={() => deletePin(pin.id)}
            />
          ))}

          {/* Draft bubble */}
          {drafting && (
            <div
              className="absolute pointer-events-auto"
              style={{ left: offsetX + drafting.x, top: offsetY + drafting.y }}
            >
            <div className="w-3 h-3 rounded-full bg-yellow-400 border-2 border-yellow-600 -translate-x-1.5 -translate-y-1.5" />
            <div className="absolute left-4 -top-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-56 z-50">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">Add comment</p>
              <textarea
                ref={inputRef}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitPin(); }
                  if (e.key === 'Escape') { setDrafting(null); setActive(false); }
                }}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400"
                rows={3}
                placeholder="Type comment… (Enter to save)"
              />
              <div className="flex gap-1.5 mt-2">
                <button
                  onClick={submitPin}
                  disabled={!draftText.trim()}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs font-medium py-1.5 rounded-lg disabled:opacity-40"
                >
                  Save
                </button>
                <button
                  onClick={() => { setDrafting(null); setActive(false); }}
                  className="px-2 text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

// ── PinBubble ─────────────────────────────────────────────────────────────────

function PinBubble({ pin, x, y, color, isOwn, onDelete }: {
  pin: CommentPin; x: number; y: number; color: string; isOwn: boolean; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="absolute pointer-events-auto"
      style={{ left: x, top: y }}
    >
      {/* Pin dot */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-6 h-6 rounded-full border-2 border-white shadow-lg -translate-x-3 -translate-y-3 hover:scale-125 transition-transform"
        style={{ background: color }}
        title={`${pin.userName}: ${pin.text}`}
      >
        <span className="text-white text-[9px] font-bold leading-none">
          {pin.userName.charAt(0).toUpperCase()}
        </span>
      </button>

      {/* Expanded bubble */}
      {expanded && (
        <div className="absolute left-5 -top-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-52 z-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color }}>{pin.userName}</span>
            <div className="flex gap-1">
              {isOwn && (
                <button onClick={onDelete} className="text-gray-300 hover:text-red-400 text-xs" title="Delete">✕</button>
              )}
              <button onClick={() => setExpanded(false)} className="text-gray-300 hover:text-gray-500 text-xs">⊠</button>
            </div>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{pin.text}</p>
          <p className="text-[10px] text-gray-400 mt-1.5">
            {new Date(pin.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  );
}
