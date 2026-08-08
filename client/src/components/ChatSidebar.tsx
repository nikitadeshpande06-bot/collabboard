/**
 * Room Chat Sidebar
 *
 * Real-time text chat panel inside every whiteboard room.
 * Messages are ephemeral (in-memory only) — they live as long as the
 * Socket.IO room exists.  This is intentional: chat is a collaboration aid,
 * not a persistent record.  A persistence layer (MongoDB) could be added later.
 *
 * Why this impresses interviewers:
 *  – Real-world product decision: ephemeral vs persistent chat
 *  – Socket.IO event design beyond just drawing ops
 *  – Clean React component with auto-scroll
 */
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { Socket } from 'socket.io-client';

interface ChatMessage {
  id:        string;
  userId:    string;
  userName:  string;
  text:      string;
  timestamp: number;
}

interface Props {
  roomId:  string;
  open:    boolean;
  onClose: () => void;
  socket:  Socket | null;
}

export default function ChatSidebar({ roomId, open, onClose, socket }: Props) {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => { socket.off('chat:message'); };
  }, [socket]);

  // Auto-scroll to newest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed || !user) return;

    const msg: ChatMessage = {
      id:        crypto.randomUUID(),
      userId:    user._id,
      userName:  user.name,
      text:      trimmed,
      timestamp: Date.now(),
    };

    socket?.emit('chat:message', { roomId, ...msg });
    // Optimistic: add our own message immediately
    setMessages((prev) => [...prev, msg]);
    setText('');
  }

  if (!open) return null;

  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-200 flex flex-col z-30 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-sm">💬 Room Chat</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center mt-8">No messages yet. Say hi! 👋</p>
        )}
        {messages.map((m) => {
          const isMe = m.userId === user?._id;
          return (
            <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className="text-[10px] text-gray-400 mb-0.5 ml-1">{m.userName}</span>
              )}
              <div
                className={`max-w-[200px] text-sm px-3 py-1.5 rounded-2xl break-words
                  ${isMe
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-900 rounded-bl-sm'}`}
              >
                {m.text}
              </div>
              <span className="text-[9px] text-gray-300 mt-0.5 mx-1">
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 flex gap-2">
        <input
          ref={inputRef}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          ↑
        </button>
      </div>
    </div>
  );
}
