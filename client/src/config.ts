/**
 * Runtime config — reads Vite env vars injected at build time.
 *
 * In production (Vercel):
 *   VITE_API_URL    → not needed; we use Vercel rewrites to proxy /api
 *   VITE_SOCKET_URL → your Railway backend URL, e.g. https://collabboard-server.up.railway.app
 *
 * In development the Vite dev-server proxy handles both /api and /socket.io,
 * so empty strings are fine and intentional.
 */
export const CONFIG = {
  api_base:   import.meta.env.VITE_API_URL    ?? '/api',
  socket_url: import.meta.env.VITE_SOCKET_URL ?? '',
};
