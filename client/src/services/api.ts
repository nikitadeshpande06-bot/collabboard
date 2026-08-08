import axios, { AxiosError } from 'axios';
import { CONFIG } from '@/config';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: CONFIG.api_base,
  withCredentials: true,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    const { refreshToken, setTokens } = useAuthStore.getState();

    if (error.response?.status === 401 && !original._retry && refreshToken) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${CONFIG.api_base}/auth/refresh`, { refreshToken });
        setTokens(data.accessToken, refreshToken);
        original.headers!['Authorization'] = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        // Refresh also failed — clear auth and send to login
        useAuthStore.getState().logout();
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  },
);

export default api;
