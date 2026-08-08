/**
 * Session Analytics Panel
 *
 * Real-time metrics for the current whiteboard session:
 *  – Total draw operations performed
 *  – Per-user operation count (who drew the most)
 *  – Session duration
 *  – Objects currently on canvas
 *
 * Why this impresses interviewers:
 *  – Shows product thinking: team leads want to see contribution metrics
 *  – Demonstrates aggregation of real-time event streams
 *  – Analytics = data engineering awareness
 */
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { DrawOperation } from '@/types';
import type { CanvasEngine } from '@/canvas/CanvasEngine';
import type { Socket } from 'socket.io-client';

interface UserStat {
  userId:   string;
  userName: string;
  ops:      number;
}

interface Props {
  engineRef: React.MutableRefObject<CanvasEngine | null>;
  roomId:    string;
  socket:    Socket | null;
}

export default function AnalyticsPanel({ engineRef, roomId, socket }: Props) {
  const [open, setOpen]           = useState(false);
  const [totalOps, setTotalOps]   = useState(0);
  const [userStats, setUserStats] = useState<Record<string, UserStat>>({});
  const [objectCount, setObjectCount] = useState(0);
  const sessionStart = useRef(Date.now());
  const [elapsed, setElapsed]     = useState(0);
  const { user } = useAuthStore();

  // Count draw operations from socket
  useEffect(() => {
    if (!socket) return;

    const handleOp = (op: DrawOperation) => {
      setTotalOps((n) => n + 1);
      setUserStats((prev) => ({
        ...prev,
        [op.userId]: {
          userId:   op.userId,
          userName: op.userName,
          ops: (prev[op.userId]?.ops ?? 0) + 1,
        },
      }));
    };

    socket.on('draw:operation', handleOp);
    return () => { socket.off('draw:operation', handleOp); };
  }, []);

  // Update canvas object count every 2 s
  useEffect(() => {
    const t = setInterval(() => {
      const fc = engineRef.current?.fabricCanvas;
      if (fc) setObjectCount(fc.getObjects().length);
    }, 2000);
    return () => clearInterval(t);
  }, [engineRef]);

  // Session timer
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - sessionStart.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  const sorted = Object.values(userStats).sort((a, b) => b.ops - a.ops);

  return (
    <div className="relative">
      <button
        className="btn-ghost text-sm flex items-center gap-1"
        onClick={() => setOpen((p) => !p)}
        title="Session analytics"
      >
        📊 Stats
      </button>

      {open && (
        <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-64">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Session Stats</p>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <MetricCard label="Total Ops"     value={totalOps}    color="text-blue-600" />
            <MetricCard label="Objects"       value={objectCount} color="text-purple-600" />
            <MetricCard label="Session Time"  value={`${mins}m ${secs}s`} color="text-green-600" />
            <MetricCard label="Contributors"  value={sorted.length} color="text-amber-600" />
          </div>

          {/* Leaderboard */}
          {sorted.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Top Contributors
              </p>
              <div className="space-y-1.5">
                {sorted.slice(0, 5).map((s, i) => {
                  const pct = totalOps > 0 ? Math.round((s.ops / totalOps) * 100) : 0;
                  const isMe = s.userId === user?._id;
                  return (
                    <div key={s.userId}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className={`font-medium ${isMe ? 'text-blue-600' : 'text-gray-700'}`}>
                          {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : `${i + 1}. `}
                          {s.userName}{isMe ? ' (you)' : ''}
                        </span>
                        <span className="text-gray-400">{s.ops} ops</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isMe ? 'bg-blue-500' : 'bg-gray-300'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {sorted.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">
              No drawing activity yet.<br/>Start drawing to see stats!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
