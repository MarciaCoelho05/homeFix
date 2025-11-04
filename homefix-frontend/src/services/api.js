import axios from 'axios';

const getApiUrl = () => {
  // Se VITE_API_URL estiver definida, usar ela
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl.endsWith('/api') && !apiUrl.endsWith('/api/')) {
      return apiUrl.endsWith('/') ? `${apiUrl}api` : `${apiUrl}/api`;
    }
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  }
  
  // Em produção, detectar automaticamente o backend
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Se for Vercel, substituir homefix-frontend por homefix-backend
    if (hostname.includes('homefix-frontend')) {
      const backendUrl = hostname.replace('homefix-frontend', 'homefix-backend');
      return `https://${backendUrl}/api`;
    }
    // Se for outro domínio Vercel, tentar padrão similar
    if (hostname.includes('vercel.app')) {
      const parts = hostname.split('.');
      if (parts.length >= 3 && parts[0].includes('homefix-frontend')) {
        const backendUrl = hostname.replace('homefix-frontend', 'homefix-backend');
        return `https://${backendUrl}/api`;
      }
    }
  }
  
  // Em desenvolvimento, usar proxy do Vite
  return '/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
