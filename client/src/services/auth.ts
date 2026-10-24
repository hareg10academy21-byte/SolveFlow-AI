import axios from 'axios';
import type { AuthUser } from '../types/auth';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api/v1',
  withCredentials: true,
});
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: { fieldErrors?: Record<string, string[]> };
}

// The token is intentionally memory-only. A Vercel page cannot read a cookie
// scoped to a separate Render API domain, but it can receive this value over HTTPS.
let csrfToken = '';
api.interceptors.request.use((config) => {
  if (!['get', 'head', 'options'].includes(config.method?.toLowerCase() ?? 'get')) {
    if (csrfToken) config.headers.set('x-csrf-token', csrfToken);
  }
  return config;
});
export async function establishCsrf() {
  const result = await api.get<ApiResponse<{ csrfToken: string }>>('/auth/csrf');
  csrfToken = result.data.data.csrfToken;
}
export async function getCurrentUser() {
  return (await api.get<ApiResponse<AuthUser>>('/auth/me')).data.data;
}
export async function login(email: string, password: string) {
  return (await api.post<ApiResponse<AuthUser>>('/auth/login', { email, password })).data.data;
}
export async function register(name: string, email: string, password: string, role: 'customer') {
  return (await api.post<ApiResponse<AuthUser>>('/auth/register', { name, email, password, role }))
    .data.data;
}
export async function logout() {
  await api.post('/auth/logout');
}
export async function updateProfile(name: string) {
  return (await api.patch<ApiResponse<AuthUser>>('/auth/me', { name })).data.data;
}
