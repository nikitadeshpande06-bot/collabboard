/**
 * OAuthCallbackPage
 *
 * The backend redirects here after a successful Google/GitHub login:
 *   /oauth-callback?accessToken=...&refreshToken=...&userId=...&name=...&email=...
 *
 * This page reads the URL params, stores them in Zustand (which persists to
 * localStorage), then redirects to /dashboard.
 */
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const { setTokens, setUser } = useAuthStore();

  useEffect(() => {
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId       = params.get('userId');
    const name         = params.get('name') ?? '';
    const email        = params.get('email') ?? '';
    const avatar       = params.get('avatar') ?? undefined;

    if (!accessToken || !refreshToken || !userId) {
      toast.error('OAuth login failed — missing data');
      navigate('/login');
      return;
    }

    setTokens(accessToken, refreshToken);
    setUser({ _id: userId, name, email, avatar, createdAt: new Date().toISOString() });
    toast.success(`Welcome, ${name}!`);
    navigate('/dashboard', { replace: true });
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
