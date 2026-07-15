import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// ponytail: same-origin via Vite dev proxy → no CORS preflight in dev.
// Production sets VITE_API_URL to the absolute backend origin.
const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || '/api/v1';

// Create axios instance.
export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token from localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ponytail: one in-flight refresh promise shared across all 401s — avoids
// the auth refresh stampede when a stale token knockout hits N parallel calls.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return null;
  try {
    const res = await axios.post<{ accessToken: string }>(
      `${API_BASE}/auth/refresh`,
      { refreshToken },
    );
    const newAccess = res.data.accessToken;
    localStorage.setItem('accessToken', newAccess);
    return newAccess;
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return null;
  }
}

// 401 → try refresh once → retry. If refresh fails, drop tokens + redirect.
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retried?: boolean };
    if (err.response?.status !== 401 || !original || original._retried) {
      // Already retried, or not a 401 — let it through.
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(err);
    }

    refreshInFlight = refreshInFlight || refreshAccessToken();
    const newToken = await refreshInFlight;
    refreshInFlight = null;

    if (!newToken) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    }

    original._retried = true;
    original.headers = original.headers || ({} as any);
    (original.headers as any).Authorization = `Bearer ${newToken}`;
    return api.request(original);
  },
);

export default api;