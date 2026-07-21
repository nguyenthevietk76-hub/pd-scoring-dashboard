const rawUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';
export const API_BASE_URL = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

