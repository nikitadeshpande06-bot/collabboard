import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { getSocket } from '@/services/socket';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminUser {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  roomCount: number;
  isOnline: boolean;
  socketId: string | null;
  lastRoom: string | null;
}

interface AdminRoom {
  _id: string;
  name: string;
  isPublic: boolean;
  members: { user: { name: string; email: string }; role: string }[];
  createdBy: { name: string; email: string };
  versionCount: number;
  onlineCount: number;
  updatedAt: string;
}

interface AdminStats {
  totalUsers: number;
  totalRooms: number;
  totalVersions: number;
  onlineNow: number;
}

// ── Excel export helpers ───────────────────────────────────────────────────────
function exportUsersToExcel(data: AdminUser[]) {
  const rows = data.map((u) => ({
    Name:       u.name,
    Email:      u.email,
    Boards:     u.roomCount,
    Status:     u.isOnline ? 'Online' : 'Offline',
    'Joined':   new Date(u.createdAt).toLocaleDateString(),
    'Last Room': u.lastRoom ?? '—',
    'User ID':  u._id,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Auto-fit column widths
  ws['!cols'] = [
    { wch: 22 }, { wch: 30 }, { wch: 8 }, { wch: 10 },
    { wch: 14 }, { wch: 26 }, { wch: 26 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  XLSX.writeFile(wb, `collabboard-users-${datestamp()}.xlsx`);
}

function exportRoomsToExcel(data: AdminRoom[]) {
  const rows = data.map((r) => ({
    'Board Name': r.name,
    Owner:        r.createdBy?.name ?? '—',
    'Owner Email':r.createdBy?.email ?? '—',
    Members:      r.members.length,
    Versions:     r.versionCount,
    'Online Now': r.onlineCount,
    Visibility:   r.isPublic ? 'Public' : 'Private',
    'Last Updated': new Date(r.updatedAt).toLocaleDateString(),
    'Board ID':   r._id,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 24 }, { wch: 20 }, { wch: 28 }, { wch: 10 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 26 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Boards');
  XLSX.writeFile(wb, `collabboard-boards-${datestamp()}.xlsx`);
}

function datestamp() {
  return new Date().toISOString().slice(0, 10);
}

// Admin secret — stored in localStorage so you don't retype it every visit
const ADMIN_SECRET_KEY = 'wb_admin_secret';

// Axios helper that injects X-Admin-Secret header
function adminApi(secret: string) {
  return {
    get: (url: string) =>
      api.get(url, { headers: { 'X-Admin-Secret': secret } }).then((r) => r.data),
    delete: (url: string) =>
      api.delete(url, { headers: { 'X-Admin-Secret': secret } }).then((r) => r.data),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [secret, setSecret] = useState(() => localStorage.getItem(ADMIN_SECRET_KEY) ?? '');
  const [secretInput, setSecretInput] = useState('');
  const [tab, setTab] = useState<'overview' | 'users' | 'rooms'>('overview');
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const isAuthed = !!secret;

  // ── Real-time online count from Socket.IO ────────────────────────────────────
  useEffect(() => {
    if (!accessToken || !secret) return;
    const socket = getSocket();
    if (!socket) return;
    socket.on('admin:online_count', ({ count }: { count: number }) => {
      setOnlineCount(count);
    });
    return () => { socket.off('admin:online_count'); };
  }, [accessToken, secret]);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const stats = useQuery<AdminStats>({
    queryKey: ['admin', 'stats', secret],
    queryFn: () => adminApi(secret).get('/api/admin/stats'),
    enabled: isAuthed,
    refetchInterval: 10_000,
  });

  const users = useQuery<AdminUser[]>({
    queryKey: ['admin', 'users', secret],
    queryFn: () => adminApi(secret).get('/api/admin/users'),
    enabled: isAuthed && tab === 'users',
    refetchInterval: 10_000,
  });

  const rooms = useQuery<AdminRoom[]>({
    queryKey: ['admin', 'rooms', secret],
    queryFn: () => adminApi(secret).get('/api/admin/rooms'),
    enabled: isAuthed && tab === 'rooms',
    refetchInterval: 15_000,
  });

  const userDetail = useQuery({
    queryKey: ['admin', 'user', selectedUser, secret],
    queryFn: () => adminApi(secret).get(`/api/admin/users/${selectedUser}`),
    enabled: !!selectedUser && isAuthed,
  });

  // ── Secret entry screen ───────────────────────────────────────────────────────
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-sm shadow-sm">
          <h1 className="text-xl font-bold mb-1">🔐 Admin Access</h1>
          <p className="text-sm text-gray-500 mb-4">Enter the admin secret from <code className="text-xs bg-gray-100 px-1 rounded">server/.env → ADMIN_SECRET</code></p>
          <input
            className="input mb-3"
            type="password"
            placeholder="Admin secret"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSecretSubmit()}
          />
          <button className="btn-primary w-full" onClick={handleSecretSubmit}>
            Enter Admin Panel
          </button>
          <button className="btn-ghost w-full mt-2 text-sm" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  function handleSecretSubmit() {
    localStorage.setItem(ADMIN_SECRET_KEY, secretInput);
    setSecret(secretInput);
  }

  // ── Stat card ─────────────────────────────────────────────────────────────────
  const StatCard = ({ label, value, color }: { label: string; value: number | string; color: string }) => (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-600">CollabBoard</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-700">Admin Panel</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 border border-green-300 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {onlineCount || stats.data?.onlineNow || 0} online now
          </span>
          <button className="btn-ghost text-sm" onClick={() => navigate('/dashboard')}>← Dashboard</button>
          <button className="btn-ghost text-sm text-red-500" onClick={() => { localStorage.removeItem(ADMIN_SECRET_KEY); setSecret(''); }}>
            Sign out of admin
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Stats row */}
        {stats.data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Users"    value={stats.data.totalUsers}    color="bg-blue-50 border-blue-200 text-blue-900" />
            <StatCard label="Total Boards"   value={stats.data.totalRooms}    color="bg-purple-50 border-purple-200 text-purple-900" />
            <StatCard label="Versions Saved" value={stats.data.totalVersions} color="bg-amber-50 border-amber-200 text-amber-900" />
            <StatCard label="Online Now"     value={onlineCount || stats.data.onlineNow} color="bg-green-50 border-green-200 text-green-900" />
          </div>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
          {(['overview', 'users', 'rooms'] as const).map((t) => (
            <button
              key={t}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => { setTab(t); setSelectedUser(null); }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW tab ────────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-lg mb-4">Platform Overview</h2>
            <p className="text-sm text-gray-500 mb-6">Switch to <strong>Users</strong> or <strong>Rooms</strong> tab to see detailed data.</p>
            <div className="space-y-3">
              <InfoRow label="API Base"       value="http://localhost:4000/api" />
              <InfoRow label="Admin Endpoint" value="GET /api/admin/users  |  GET /api/admin/rooms  |  GET /api/admin/stats" />
              <InfoRow label="Auth Header"    value="Authorization: Bearer <accessToken>" />
              <InfoRow label="Admin Header"   value="X-Admin-Secret: <your_secret>" />
              <InfoRow label="MongoDB"        value="mongodb://localhost:27017/whiteboard" />
            </div>
          </div>
        )}

        {/* ── USERS tab ────────────────────────────────────────────────────────── */}
        {tab === 'users' && !selectedUser && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold">All Users ({users.data?.length ?? '…'})</h2>
              <div className="flex items-center gap-2">
                {users.data && users.data.length > 0 && (
                  <button
                    className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                    onClick={() => exportUsersToExcel(users.data!)}
                    title="Download as Excel spreadsheet"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export Excel
                  </button>
                )}
                <button className="text-xs text-blue-600" onClick={() => users.refetch()}>↻ Refresh</button>
              </div>
            </div>
            {users.isLoading ? (
              <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2 font-medium text-gray-500">User</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Email</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Boards</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Status</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Joined</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {users.data?.map((u) => (
                    <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-semibold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-center">{u.roomCount}</td>
                      <td className="px-4 py-3 text-center">
                        {u.isOnline ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Offline</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          className="text-xs text-blue-600 hover:underline mr-3"
                          onClick={() => setSelectedUser(u._id)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── USER DETAIL ──────────────────────────────────────────────────────── */}
        {tab === 'users' && selectedUser && (
          <div className="space-y-4">
            <button className="text-sm text-blue-600 hover:underline" onClick={() => setSelectedUser(null)}>
              ← Back to all users
            </button>

            {userDetail.isLoading ? (
              <p className="text-gray-400 text-sm">Loading…</p>
            ) : userDetail.data ? (
              <>
                {/* User info card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-blue-500 text-white text-xl flex items-center justify-center font-bold">
                      {userDetail.data.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">{userDetail.data.user.name}</h2>
                      <p className="text-sm text-gray-500">{userDetail.data.user.email}</p>
                      <p className="text-xs text-gray-400">ID: {userDetail.data.user._id}</p>
                    </div>
                    <div className="ml-auto">
                      {userDetail.data.isOnline ? (
                        <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Currently Online
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 border border-gray-200 px-3 py-1 rounded-full">Offline</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-blue-600">{userDetail.data.rooms.length}</p>
                      <p className="text-xs text-gray-500">Boards</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-2xl font-bold text-purple-600">{userDetail.data.versions.length}</p>
                      <p className="text-xs text-gray-500">Versions saved</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mt-1">{new Date(userDetail.data.user.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">Joined</p>
                    </div>
                  </div>

                  {userDetail.data.isOnline && userDetail.data.onlineInfo && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
                      <p className="font-semibold text-green-800 mb-1">🟢 Live Session</p>
                      <p className="text-green-700">Socket ID: <code>{userDetail.data.onlineInfo.socketId}</code></p>
                      <p className="text-green-700">In Room: <code>{userDetail.data.onlineInfo.roomId ?? 'No room'}</code></p>
                      <p className="text-green-700">Connected: {new Date(userDetail.data.onlineInfo.connectedAt).toLocaleTimeString()}</p>
                    </div>
                  )}
                </div>

                {/* User's rooms */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100">
                    <h3 className="font-semibold">Boards ({userDetail.data.rooms.length})</h3>
                  </div>
                  {userDetail.data.rooms.length === 0 ? (
                    <p className="text-center text-gray-400 py-6 text-sm">No boards</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="text-left px-5 py-2 text-gray-500 font-medium">Name</th>
                          <th className="text-center px-4 py-2 text-gray-500 font-medium">Role</th>
                          <th className="text-center px-4 py-2 text-gray-500 font-medium">Members</th>
                          <th className="text-center px-4 py-2 text-gray-500 font-medium">Last updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDetail.data.rooms.map((r: AdminRoom) => (
                          <tr key={r._id} className="border-b border-gray-50">
                            <td className="px-5 py-2 font-medium">{r.name}</td>
                            <td className="px-4 py-2 text-center">
                              <RoleBadge role={r.members.find(m => m.user.email === userDetail.data.user.email)?.role ?? 'member'} />
                            </td>
                            <td className="px-4 py-2 text-center text-gray-500">{r.members.length}</td>
                            <td className="px-4 py-2 text-center text-gray-400 text-xs">{new Date(r.updatedAt).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ── ROOMS tab ────────────────────────────────────────────────────────── */}
        {tab === 'rooms' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold">All Boards ({rooms.data?.length ?? '…'})</h2>
              <div className="flex items-center gap-2">
                {rooms.data && rooms.data.length > 0 && (
                  <button
                    className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                    onClick={() => exportRoomsToExcel(rooms.data!)}
                    title="Download as Excel spreadsheet"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Export Excel
                  </button>
                )}
                <button className="text-xs text-blue-600" onClick={() => rooms.refetch()}>↻ Refresh</button>
              </div>
            </div>
            {rooms.isLoading ? (
              <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-2 font-medium text-gray-500">Board Name</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-500">Owner</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Members</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Versions</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Online</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Visibility</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-500">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.data?.map((r) => (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3 text-gray-600">{r.createdBy?.name}</td>
                      <td className="px-4 py-3 text-center">{r.members.length}</td>
                      <td className="px-4 py-3 text-center">{r.versionCount}</td>
                      <td className="px-4 py-3 text-center">
                        {r.onlineCount > 0 ? (
                          <span className="flex items-center justify-center gap-1 text-xs text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            {r.onlineCount} active
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.isPublic ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                          {r.isPublic ? 'Public' : 'Private'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">
                        {new Date(r.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 w-36 shrink-0">{label}</span>
      <code className="text-gray-700 text-xs break-all">{value}</code>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colours: Record<string, string> = {
    owner:  'bg-amber-100 text-amber-700',
    editor: 'bg-blue-100 text-blue-700',
    viewer: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colours[role] ?? colours.viewer}`}>
      {role}
    </span>
  );
}
