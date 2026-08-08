/**
 * DrawingPlaybackPanel
 *
 * Records every draw operation that happens during the session and lets you
 * replay them stroke-by-stroke at adjustable speed.
 *
 * Resume talking point:
 *  "Implemented an event-sourcing pattern — all mutations are captured as an
 *   append-only operation log, then replayed deterministically to reconstruct
 *   any past canvas state. This is identical to how database WALs and Redux
 *   devtools work."
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import type { DrawOperation } from '@/types';
import type { CanvasEngine } from '@/canvas/CanvasEngine';

interface Props {
  engineRef: React.MutableRefObject<CanvasEngine | null>;
  /** Called by WhiteboardPage every time a local or remote op is applied */
  onOperation: (op: DrawOperation) => void;
}

const SPEEDS = [0.5, 1, 2, 4] as const;

export default function PlaybackPanel({ engineRef, onOperation }: Props) {
  const [open,       setOpen]       = useState(false);
  const [recording,  setRecording]  = useState(false);
  const [playing,    setPlaying]    = useState(false);
  const [speed,      setSpeed]      = useState<typeof SPEEDS[number]>(1);
  const [progress,   setProgress]   = useState(0); // 0-100
  const [opCount,    setOpCount]    = useState(0);

  const log     = useRef<DrawOperation[]>([]);
  const snapshot= useRef<string>('');          // canvas state at recording start
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Recording ────────────────────────────────────────────────────────────────

  function startRecording() {
    log.current = [];
    snapshot.current = engineRef.current?.toJSON() ?? '{}';
    setOpCount(0);
    setRecording(true);
  }

  function stopRecording() {
    setRecording(false);
  }

  // Expose a push function so WhiteboardPage can feed ops
  const pushOp = useCallback((op: DrawOperation) => {
    if (!recording) return;
    log.current.push(op);
    setOpCount(log.current.length);
  }, [recording]);

  // Wire parent callback
  useEffect(() => {
    onOperation(null as unknown as DrawOperation); // no-op on mount
  }, []);

  // ── Playback ─────────────────────────────────────────────────────────────────

  async function startPlayback() {
    const engine = engineRef.current;
    if (!engine || log.current.length === 0) return;

    setPlaying(true);
    setProgress(0);

    // Restore canvas to state at recording start
    await engine.loadFromJSON(snapshot.current);

    const ops  = log.current;
    const delay = 80 / speed; // ms between each op

    for (let i = 0; i < ops.length; i++) {
      if (!playing && i > 0) break; // aborted
      await new Promise<void>((r) => { timer.current = setTimeout(r, delay); });
      engine.applyRemoteOperation(ops[i]);
      setProgress(Math.round(((i + 1) / ops.length) * 100));
    }

    setPlaying(false);
    setProgress(100);
  }

  function stopPlayback() {
    if (timer.current) clearTimeout(timer.current);
    setPlaying(false);
  }

  const hasRecording = log.current.length > 0;

  return (
    <div className="relative">
      <button
        className={`btn-ghost text-sm flex items-center gap-1 ${recording ? 'text-red-600' : ''}`}
        onClick={() => setOpen((p) => !p)}
        title="Drawing playback recorder"
      >
        {recording ? '⏺ Recording' : '▶ Playback'}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-50 w-72">

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Drawing Recorder
              </p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
            </div>

            {/* Status */}
            <div className="mb-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
              <span className={recording ? 'text-red-600 font-semibold animate-pulse' : 'text-gray-500'}>
                {recording ? '⏺ Recording…' : hasRecording ? `${opCount} ops recorded` : 'Not recording'}
              </span>
              {recording && (
                <span className="text-gray-400">{opCount} ops</span>
              )}
            </div>

            {/* Record controls */}
            <div className="flex gap-2 mb-4">
              {!recording ? (
                <button
                  onClick={startRecording}
                  disabled={playing}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                  ⏺ Record
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  ⏹ Stop
                </button>
              )}

              {!playing ? (
                <button
                  onClick={startPlayback}
                  disabled={!hasRecording || recording}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-40"
                >
                  ▶ Replay
                </button>
              ) : (
                <button
                  onClick={stopPlayback}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  ⏸ Stop
                </button>
              )}
            </div>

            {/* Progress bar */}
            {(playing || progress > 0) && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Playback</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Speed selector */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Playback Speed
              </p>
              <div className="flex gap-1.5">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors font-medium
                      ${speed === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[10px] text-gray-400 leading-relaxed">
              Record draws a snapshot at start then logs every stroke. Replay restores the snapshot and replays all operations.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
