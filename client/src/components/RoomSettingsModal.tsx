/**
 * RoomSettingsModal
 *
 * Owner-only modal that allows:
 *  - Renaming the room
 *  - Toggling public/private visibility
 *  - Viewing & managing member roles (promote/demote/remove)
 *  - Regenerating the invite link (invalidates old links)
 *
 * Design decisions:
 *  - Owner cannot be removed or demoted via this UI
 *  - Invite regeneration immediately updates the Dashboard copy-link
 *  - Uses React Query mutations so changes are reflected everywhere instantly
 */
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import type { Room, RoomRole } from '@/types';

interface Props {
  room:    Room;
  onClose: () => void;
}

const ROLE_LABELS: Record<RoomRole, string> = {
  owner:  'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_COLORS: Record<RoomRole, string> = {
  owner:  'bg-amber-100 text-amber-700',
  editor: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export default function RoomSettingsModal({ room, onClose }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'general' | 'members'>('general');

  // General settings state
  const [name,        setName]       = useState(room.name);
  const [description, setDesc]       = useState(room.description ?? '');
  const [isPublic,    setIsPublic]   = useState(room.isPublic);
  const [inviteToken, setInviteToken] = useState(room.inviteToken);

  const isOwner = room.members.find((m) => m.user._id === user?._id)?.role === 'owner';

  // ── Save general settings ───────────────────────────────────────────────────
  const saveSettings = useMutation({
    mutationFn: () =>
      api.patch(`/rooms/${room._id}/settings`, { name, description, isPublic }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room', room._id] });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('Settings saved!');
      onClose();
    },
    onError: () => toast.error('Failed to save settings'),
  });

  // ── Change member role ──────────────────────────────────────────────────────
  const changeRole = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: RoomRole }) =>
      api.patch(`/rooms/${room._id}/members/${memberId}`, { role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room', room._id] });
      toast.success('Role updated');
    },
    onError: () => toast.error('Failed to update role'),
  });

  // ── Remove member ───────────────────────────────────────────────────────────
  const removeMember = useMutation({
    mutationFn: (memberId: string) =>
      api.delete(`/rooms/${room._id}/members/${memberId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['room', room._id] });
      toast.success('Member removed');
    },
    onError: () => toast.error('Failed to remove member'),
  });

  // ── Regenerate invite link ──────────────────────────────────────────────────
  const regenInvite = useMutation({
    mutationFn: () =>
      api.post(`/rooms/${room._id}/regenerate-invite`).then((r) => r.data),
    onSuccess: ({ inviteToken: newToken }: { inviteToken: string }) => {
      setInviteToken(newToken);
      qc.invalidateQueries({ queryKey: ['rooms'] });
      toast.success('New invite link generated!');
    },
    onError: () => toast.error('Failed to regenerate invite link'),
  });

  const inviteLink = `${window.location.origin}/join/${inviteToken}`;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-lg">Room Settings</h2>
            <p className="text-xs text-gray-400 truncate max-w-xs">{room.name}</p>
          </div>
          <button className="text-gray-400 hover:text-gray-600 text-xl" onClick={onClose}>✕</button>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 p-3 border-b border-gray-100 bg-gray-50">
          {(['general', 'members'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'general' ? 'General' : `Members (${room.members.length})`}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5">

          {/* ── GENERAL tab ─────────────────────────────────────────────────── */}
          {tab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Board Name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  disabled={!isOwner}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={description}
                  onChange={(e) => setDesc(e.target.value)}
                  maxLength={500}
                  placeholder="Optional board description…"
                  disabled={!isOwner}
                />
              </div>

              {/* Visibility toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <div className="flex gap-2">
                  {[false, true].map((pub) => (
                    <button
                      key={String(pub)}
                      disabled={!isOwner}
                      onClick={() => setIsPublic(pub)}
                      className={`flex-1 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        isPublic === pub
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {pub ? '🌍 Public' : '🔒 Private'}
                      <p className="text-xs font-normal text-gray-400 mt-0.5">
                        {pub ? 'Anyone with link can view' : 'Only invited members'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Invite link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invite Link</label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-xs"
                    value={inviteLink}
                    readOnly
                  />
                  <button
                    className="btn-ghost text-sm whitespace-nowrap"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success('Copied!');
                    }}
                  >
                    Copy
                  </button>
                </div>
                {isOwner && (
                  <button
                    className="text-xs text-red-500 hover:underline mt-1.5"
                    onClick={() => {
                      if (confirm('Regenerate invite link? All existing invite links will stop working.')) {
                        regenInvite.mutate();
                      }
                    }}
                    disabled={regenInvite.isPending}
                  >
                    ↻ Regenerate link (invalidates current)
                  </button>
                )}
              </div>

              {isOwner && (
                <button
                  className="btn-primary w-full"
                  onClick={() => saveSettings.mutate()}
                  disabled={saveSettings.isPending || !name.trim()}
                >
                  {saveSettings.isPending ? 'Saving…' : 'Save Settings'}
                </button>
              )}
            </div>
          )}

          {/* ── MEMBERS tab ─────────────────────────────────────────────────── */}
          {tab === 'members' && (
            <div className="space-y-2">
              {room.members.map((member) => {
                const isMe      = member.user._id === user?._id;
                const isThisOwner = member.role === 'owner';

                return (
                  <div
                    key={member.user._id}
                    className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden">
                      {member.user.avatar ? (
                        <img src={member.user.avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                          {member.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Name + email */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {member.user.name} {isMe && <span className="text-gray-400 font-normal">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                    </div>

                    {/* Role badge / picker */}
                    {isOwner && !isThisOwner && !isMe ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          changeRole.mutate({ memberId: member.user._id, role: e.target.value as RoomRole })
                        }
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white cursor-pointer"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role]}`}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}

                    {/* Remove button */}
                    {isOwner && !isThisOwner && !isMe && (
                      <button
                        className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                        title="Remove member"
                        onClick={() => {
                          if (confirm(`Remove ${member.user.name} from this board?`)) {
                            removeMember.mutate(member.user._id);
                          }
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
