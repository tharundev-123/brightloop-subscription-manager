import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token from localStorage to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('brightloop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor for session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized and we're not already on an auth page, clear session
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/signup') && !path.startsWith('/forgot-password') && !path.startsWith('/reset-password')) {
        localStorage.removeItem('brightloop_token');
        localStorage.removeItem('brightloop_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

