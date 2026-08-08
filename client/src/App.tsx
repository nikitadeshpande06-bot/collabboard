import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import RoleSelectorPage  from '@/pages/RoleSelectorPage';
import LoginPage         from '@/pages/LoginPage';
import RegisterPage      from '@/pages/RegisterPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import DashboardPage     from '@/pages/DashboardPage';
import WhiteboardPage    from '@/pages/WhiteboardPage';
import JoinRoomPage      from '@/pages/JoinRoomPage';
import AdminPage         from '@/pages/AdminPage';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { accessToken, _hasHydrated } = useAuthStore();
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  // Unauthenticated → send to role selector, not directly to /login
  if (!accessToken) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ── Entry point — role selector ───────────────────────────────── */}
      <Route path="/"               element={<RoleSelectorPage />} />

      {/* ── Auth pages ────────────────────────────────────────────────── */}
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/register"       element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

      {/* ── Protected pages ───────────────────────────────────────────── */}
      <Route path="/dashboard"      element={<RequireAuth><DashboardPage /></RequireAuth>} />
      <Route path="/room/:roomId"   element={<RequireAuth><WhiteboardPage /></RequireAuth>} />
      <Route path="/admin"          element={<RequireAuth><AdminPage /></RequireAuth>} />
      <Route path="/join/:inviteToken" element={<RequireAuth><JoinRoomPage /></RequireAuth>} />

      {/* ── Fallback ──────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
