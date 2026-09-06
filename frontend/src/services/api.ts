import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: `${API_URL}/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for idempotency keys
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Add idempotency key for mutating requests
  if (['post', 'patch', 'delete'].includes(config.method || '')) {
    config.headers['Idempotency-Key'] = crypto.randomUUID();
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        await axios.post(`${API_URL}/v1/auth/refresh`, {}, { withCredentials: true });
        // Retry original request
        return api.request(error.config!);
      } catch {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;