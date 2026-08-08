import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { initSocket, joinRoom, leaveRoom } from '@/services/socket';
import { useWhiteboardCanvas } from '@/hooks/useWhiteboardCanvas';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRoomStore } from '@/store/roomStore';
import { useDarkMode } from '@/hooks/useDarkMode';

// Components
import Toolbar           from '@/components/Toolbar';
import TextFormatBar     from '@/components/TextFormatBar';
import UserList          from '@/components/UserList';
import VersionPanel      from '@/components/VersionPanel';
import OfflineBadge      from '@/components/OfflineBadge';
import ChatSidebar       from '@/components/ChatSidebar';
import CursorOverlay     from '@/components/CursorOverlay';
import ExportPanel       from '@/components/ExportPanel';
import AnalyticsPanel    from '@/components/AnalyticsPanel';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import TemplatesPanel    from '@/components/TemplatesPanel';
import PlaybackPanel     from '@/components/PlaybackPanel';
import LaserPointer      from '@/components/LaserPointer';
import CommentPins       from '@/components/CommentPins';
import ActivityFeed        from '@/components/ActivityFeed';
import CanvasContextMenu   from '@/components/CanvasContextMenu';

import type { Room, OnlineUser } from '@/types';

const CANVAS_ID = 'main-canvas';

export default function WhiteboardPage() {
  const { roomId }  = useParams<{ roomId: string }>();
  const navigate    = useNavigate();
  const { user, accessToken } = useAuthStore();
  const { setActiveRoom, addOnlineUser, removeOnlineUser, updateCursor } = useRoomStore();
  const { isOnline }  = useNetworkStatus();
  const { dark, toggle: toggleDark } = useDarkMode();

  const [textSelected, setTextSelected] = useState(false);
  const [chatOpen,     setChatOpen]     = useState(false);

  // Context menu
  const [ctxMenu,      setCtxMenu]      = useState<{ x: number; y: number } | null>(null);
  const [hasClipboard, setHasClipboard] = useState(false);

  // Recorded ops for playback + activity feed
  const [recordedOps, setRecordedOps] = useState<any[]>([]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // ── Socket — initialise synchronously so child components can call getSocket() ──
  // initSocket is idempotent: returns existing socket if already connected.
  const socket = accessToken ? initSocket(accessToken) : null;

  // ── Fetch room ──────────────────────────────────────────────────────────────
  const { data: room } = useQuery<Room>({
    queryKey: ['room', roomId],
    queryFn:  () => api.get(`/rooms/${roomId}`).then((r) => r.data),
    enabled:  !!roomId,
  });

  // ── Socket room-presence listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('room:user_joined', (u: OnlineUser) => addOnlineUser(u));
    socket.on('room:user_left', ({ socketId }: { socketId: string }) => removeOnlineUser(socketId));

    return () => {
      socket.off('room:user_joined');
      socket.off('room:user_left');
    };
  }, [socket]); // eslint-disable-line

  useEffect(() => {
    if (room && roomId) {
      setActiveRoom(room);
      joinRoom(roomId);
    }
    return () => { if (roomId) leaveRoom(roomId); };
  }, [room, roomId]); // eslint-disable-line

  // ── Canvas engine ───────────────────────────────────────────────────────────
  const { undo, redo, clear, toJSON, insertImage, engineRef,
          copy, cut, paste, deleteSelected, hasSelection } = useWhiteboardCanvas(
    CANVAS_ID,
    roomId ?? '',
    user?._id ?? '',
    user?.name ?? 'Unknown',
    room?.canvasData,
    setTextSelected,
  );

  // ── Offline sync ────────────────────────────────────────────────────────────
  useOfflineSync(roomId);

  // ── Context menu handler ────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    // Only show if something is selected OR we have clipboard content
    if (!hasSelection() && !hasClipboard) return;
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, [hasSelection, hasClipboard]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const tag  = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (ctrl && e.key === 's') { e.preventDefault(); toJSON(); }
      if (ctrl && e.key === 'c') { e.preventDefault(); copy(); setHasClipboard(true); }
      if (ctrl && e.key === 'x') { e.preventDefault(); cut();  setHasClipboard(true); }
      if (ctrl && e.key === 'v') { e.preventDefault(); paste(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't intercept backspace when an IText is in editing mode
        const activeObj = engineRef.current?.fabricCanvas.getActiveObject() as any;
        if (activeObj?.isEditing) return;
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, toJSON, copy, cut, paste, deleteSelected, engineRef]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-3 py-2 flex items-center gap-2 z-10 flex-wrap">
        {/* Logo + room name */}
        <button onClick={() => navigate('/dashboard')} className="font-bold text-blue-600 hover:opacity-80 transition-opacity">
          CollabBoard
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium truncate max-w-[160px]">{room?.name ?? '…'}</span>

        {!isOnline && <OfflineBadge />}

        {/* Text format bar — appears when a text object is selected */}
        {textSelected && <TextFormatBar engineRef={engineRef} />}

        {/* Right-side controls */}
        <div className="ml-auto flex items-center gap-1 flex-wrap">
          <TemplatesPanel engineRef={engineRef} />
          <ExportPanel    engineRef={engineRef} roomName={room?.name ?? 'board'} />
          <AnalyticsPanel engineRef={engineRef} roomId={roomId ?? ''} socket={socket} />
          <PlaybackPanel  engineRef={engineRef} onOperation={(op) => op && setRecordedOps((p) => [...p, op])} />
          <ActivityFeed   socket={socket} roomId={roomId ?? ''} localOps={recordedOps} />
          <LaserPointer   roomId={roomId ?? ''} socket={socket} canvasContainerRef={canvasContainerRef} />
          <CommentPins    roomId={roomId ?? ''} socket={socket} canvasContainerRef={canvasContainerRef} />
          <KeyboardShortcuts />

          {/* Dark mode toggle */}
          <button
            className="btn-ghost text-sm"
            onClick={toggleDark}
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>

          {/* Chat toggle */}
          <button
            className={`btn-ghost text-sm ${chatOpen ? 'bg-blue-50 text-blue-600' : ''}`}
            onClick={() => setChatOpen((p) => !p)}
            title="Room chat"
          >
            💬 Chat
          </button>

          <UserList />
          <VersionPanel roomId={roomId!} toJSON={toJSON} />
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Left toolbar */}
        <Toolbar undo={undo} redo={redo} clear={clear} insertImage={insertImage} />

        {/* Canvas container */}
        <div
          ref={canvasContainerRef}
          className="flex-1 overflow-hidden relative"
          onContextMenu={handleContextMenu}
        >
          <canvas id={CANVAS_ID} />

          {/* Live cursor overlay */}
          <CursorOverlay
            roomId={roomId ?? ''}
            canvasContainerRef={canvasContainerRef}
            socket={socket}
          />

        </div>

        {/* Context menu */}
        {ctxMenu && (
          <CanvasContextMenu
            x={ctxMenu.x}
            y={ctxMenu.y}
            hasSelection={hasSelection()}
            hasClipboard={hasClipboard}
            onCut={() => { cut();  setHasClipboard(true); }}
            onCopy={() => { copy(); setHasClipboard(true); }}
            onPaste={() => paste()}
            onDelete={() => deleteSelected()}
            onClose={() => setCtxMenu(null)}
          />
        )}

        {/* Chat sidebar */}
        <ChatSidebar
          roomId={roomId ?? ''}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          socket={socket}
        />

      </div>
    </div>
  );
}
