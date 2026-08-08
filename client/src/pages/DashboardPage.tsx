import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Room } from '@/types';

export default function DashboardPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAuthStore();
  const [newRoomName, setNewRoomName] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: rooms = [], isLoading } = useQuery<Room[]>({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms').then((r) => r.data),
  });

  const createRoom = useMutation({
    mutationFn: () => api.post('/rooms', { name: newRoomName }).then((r) => r.data),
    onSuccess: (room: Room) => {
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Room created!');
      setShowCreate(false);
      setNewRoomName('');
      navigate(`/room/${room._id}`);
    },
    onError: () => toast.error('Could not create room'),
  });

  const deleteRoom = useMutation({
    mutationFn: (id: string) => api.delete(`/rooms/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-blue-600">CollabBoard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button className="btn-ghost text-sm" onClick={() => { logout(); navigate('/'); }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">My Boards</h2>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + New Board
          </button>
        </div>

        {/* Create dialog */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="text-lg font-semibold mb-4">New Board</h3>
              <input
                className="input mb-4"
                placeholder="Board name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createRoom.mutate()}
              />
              <div className="flex gap-2 justify-end">
                <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => createRoom.mutate()} disabled={!newRoomName.trim()}>
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rooms grid */}
        {isLoading ? (
          <p className="text-gray-400">Loading…</p>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🎨</p>
            <p>No boards yet. Create one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room._id}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => navigate(`/room/${room._id}`)}
              >
                <div className="h-24 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg mb-3 flex items-center justify-center text-3xl">
                  🖌️
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 truncate">{room.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {room.members.length} member{room.members.length !== 1 ? 's' : ''} ·{' '}
                      {new Date(room.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {room.createdBy?._id === user?._id && (
                    <button
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1"
                      onClick={(e) => { e.stopPropagation(); deleteRoom.mutate(room._id); }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* Invite link */}
                <div
                  className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`${window.location.origin}/join/${room.inviteToken}`);
                    toast.success('Invite link copied!');
                  }}
                >
                  🔗 Copy invite link
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
