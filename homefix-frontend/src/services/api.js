import axios from 'axios';

// Detectar URL da API baseado no ambiente
const getApiUrl = () => {
  // Se VITE_API_URL estiver definido, usar esse (para backend separado)
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL;
    // Garantir que termina com /api se não tiver
    if (!apiUrl.endsWith('/api') && !apiUrl.endsWith('/api/')) {
      return apiUrl.endsWith('/') ? `${apiUrl}api` : `${apiUrl}/api`;
    }
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  }
  
  // Fallback: se estiver em produção e não tiver VITE_API_URL configurado,
  // tentar inferir do hostname (para deployments separados no Vercel)
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Se o hostname contém 'homefix-frontend', assumir backend separado
    if (hostname.includes('homefix-frontend') || hostname.includes('vercel.app')) {
      // Tentar inferir o backend URL
      const backendUrl = hostname.replace('homefix-frontend', 'homefix-backend');
      return `https://${backendUrl}/api`;
    }
  }
  
  // Em desenvolvimento ou quando backend e frontend estão no mesmo domínio
  return '/api';
};

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Adiciona o token JWT automaticamente a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
