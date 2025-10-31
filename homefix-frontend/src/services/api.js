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
  
  // Em produção no Vercel sem VITE_API_URL: backend e frontend no mesmo domínio
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
