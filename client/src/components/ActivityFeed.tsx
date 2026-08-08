/**
 * ActivityFeed
 *
 * Live sidebar showing who did what and when — a real-time audit trail of
 * all drawing actions in the room.
 *
 * Resume talking point:
 *  "Implemented an event-driven activity feed using Socket.IO as a pub/sub
 *   broker. Each client publishes structured activity events on draw actions;
 *   the server fans them out to all room members. This mirrors how Slack's
 *   activity API and GitHub's event stream work."
 */
import { useState, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { DrawOperation } from '@/types';

interface ActivityEvent {
  id:       string;
  userId:   string;
  userName: string;
  action:   string;
  ts:       number;
}

interface Props {
  socket:    Socket | null;
  roomId:    string;
  /** Feed your own local operations here so they appear too */
  localOps?: DrawOperation[];
}

const ACTION_LABELS: Record<string, string> = {
  add:    'drew',
  modify: 'edited',
  remove: 'deleted',
  clear:  'cleared the board',
  join:   'joined the room',
  leave:  'left the room',
  save:   'saved a version',
};

export default function ActivityFeed({ socket, roomId, localOps }: Props) {
  const [open,   setOpen]   = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const seenOps = useRef(new Set<string>());

  const push = (ev: Omit<ActivityEvent, 'id'>) => {
    setEvents((prev) => [
      ...prev.slice(-99), // keep last 100
      { ...ev, id: crypto.randomUUID() },
    ]);
  };

  // ── Remote events ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onActivity = (ev: ActivityEvent) => push(ev);
    const onJoin = ({ userName }: { userName: string; userId: string }) =>
      push({ userId: '', userName, action: 'join', ts: Date.now() });
    const onLeft = ({ userId }: { socketId: string; userId: string }) =>
      push({ userId, userName: 'Someone', action: 'leave', ts: Date.now() });

    socket.on('activity:event',   onActivity);
    socket.on('room:user_joined', onJoin);
    socket.on('room:user_left',   onLeft);
    return () => {
      socket.off('activity:event',   onActivity);
      socket.off('room:user_joined', onJoin);
      socket.off('room:user_left',   onLeft);
    };
  }, [socket]);

  // ── Local op feed ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localOps) return;
    const latest = localOps[localOps.length - 1];
    if (!latest || seenOps.current.has(latest.id)) return;
    seenOps.current.add(latest.id);
    push({
      userId:   latest.userId,
      userName: latest.userName,
      action:   latest.type,
      ts:       latest.timestamp,
    });
    // Emit to server so remote peers see this event
    socket?.emit('activity:event', { roomId, action: latest.type });
  }, [localOps, socket, roomId]);

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events, open]);

  const badge = events.length > 0 ? Math.min(events.length, 99) : null;

  return (
    <div className="relative">
      <button
        className="btn-ghost text-sm relative"
        onClick={() => setOpen((p) => !p)}
        title="Room activity feed"
      >
        📋 Activity
        {badge && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-72 flex flex-col max-h-96">

            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Activity Feed
              </p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {events.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No activity yet — start drawing!
                </p>
              ) : (
                events.slice().reverse().map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2 py-1">
                    {/* Avatar */}
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 shrink-0 mt-0.5">
                      {ev.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-tight">
                        <span className="font-semibold">{ev.userName}</span>{' '}
                        <span className="text-gray-500">{ACTION_LABELS[ev.action] ?? ev.action}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(ev.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {events.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-100">
                <button
                  onClick={() => setEvents([])}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear feed
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
