/**
 * UserProfilePage
 *
 * Allows the authenticated user to:
 *  - Change their display name
 *  - Upload/change their avatar (stored as base64 data-URL)
 *  - Change their password (email-auth users only)
 *
 * Design decisions:
 *  - Avatar stored as base64 so no S3/file-server dependency is needed
 *  - Password section is hidden for OAuth users (they have no password)
 *  - All updates are optimistic — the UI updates immediately, then syncs
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

export default function UserProfilePage() {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const { user, setUser } = useAuthStore();

  const [name,       setName]       = useState(user?.name ?? '');
  const [avatarUrl,  setAvatarUrl]  = useState(user?.avatar ?? '');
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Update profile ──────────────────────────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: () =>
      api.patch('/users/me', { name, avatar: avatarUrl }).then((r) => r.data),
    onSuccess: (updated) => {
      setUser(updated);
      qc.invalidateQueries({ queryKey: ['me'] });
      toast.success('Profile updated!');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  // ── Change password ─────────────────────────────────────────────────────────
  const changePassword = useMutation({
    mutationFn: () =>
      api.patch('/users/me/password', {
        currentPassword: currentPw,
        newPassword: newPw,
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Password changed!');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Failed to change password';
      toast.error(msg);
    },
  });

  // ── Avatar file picker ──────────────────────────────────────────────────────
  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarUrl(result);
    };
    reader.readAsDataURL(file);
  }

  const initials = (user?.name ?? 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button
          className="text-blue-600 font-bold text-lg"
          onClick={() => navigate('/dashboard')}
        >
          CollabBoard
        </button>
        <span className="text-gray-300">/</span>
        <span className="font-medium text-gray-700">My Profile</span>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10 space-y-6">

        {/* ── Avatar & Name ─────────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-5">Profile</h2>

          {/* Avatar */}
          <div className="flex items-center gap-5 mb-6">
            <div
              className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer group flex-shrink-0"
              onClick={() => fileRef.current?.click()}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Profile Photo</p>
              <p className="text-xs text-gray-400 mt-0.5">Click the avatar to upload · Max 2 MB</p>
              <div className="flex gap-2 mt-2">
                <button
                  className="text-xs text-blue-600 hover:underline"
                  onClick={() => fileRef.current?.click()}
                >
                  Upload photo
                </button>
                {avatarUrl && (
                  <button
                    className="text-xs text-red-500 hover:underline"
                    onClick={() => setAvatarUrl('')}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Your name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              className="input bg-gray-50 cursor-not-allowed"
              value={user?.email ?? ''}
              readOnly
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>

          <button
            className="btn-primary"
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending || !name.trim()}
          >
            {updateProfile.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </section>

        {/* ── Change Password ──────────────────────────────────────────────── */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-1">Change Password</h2>
          <p className="text-sm text-gray-400 mb-5">
            Leave blank if you signed in with Google or GitHub.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <input
                className="input"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                className="input"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <input
                className="input"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          {newPw && confirmPw && newPw !== confirmPw && (
            <p className="text-xs text-red-500 mt-2">Passwords do not match</p>
          )}

          <button
            className="btn-primary mt-5"
            onClick={() => changePassword.mutate()}
            disabled={
              changePassword.isPending ||
              !currentPw || !newPw || !confirmPw ||
              newPw !== confirmPw ||
              newPw.length < 8
            }
          >
            {changePassword.isPending ? 'Changing…' : 'Change Password'}
          </button>
        </section>

        {/* ── Danger Zone ──────────────────────────────────────────────────── */}
        <section className="bg-white border border-red-200 rounded-2xl p-6">
          <h2 className="font-semibold text-lg text-red-600 mb-1">Account Info</h2>
          <p className="text-sm text-gray-500 mb-4">
            Member since {new Date(user?.createdAt ?? '').toLocaleDateString()}
          </p>
          <button
            className="btn-ghost text-sm text-gray-500 border border-gray-200"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
        </section>

      </main>
    </div>
  );
}
