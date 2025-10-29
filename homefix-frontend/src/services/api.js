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
  
  // Se estiver em produção no Vercel e não tiver VITE_API_URL, 
  // assume que o backend está no mesmo domínio
  if (import.meta.env.PROD) {
    return '/api';
  }
  
  // Development: usar o proxy do Vite
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
