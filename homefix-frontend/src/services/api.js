import axios from 'axios';

const getApiUrl = () => {
  // PRIORIDADE ABSOLUTA: Se VITE_API_URL estiver definida, usar ela SEMPRE
  if (import.meta.env.VITE_API_URL) {
    let apiUrl = String(import.meta.env.VITE_API_URL).trim();
    
    // Remover qualquer caractere problemático
    apiUrl = apiUrl.replace(/^\//, ''); // Remove barra inicial se houver
    
    // Garantir que começa com http:// ou https://
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `https://${apiUrl}`;
    }
    
    // Remover barras finais
    apiUrl = apiUrl.replace(/\/+$/, '');
    
    // Adicionar /api se não terminar com /api
    if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl}/api`;
    }
    
    // Debug
    console.log('[API] Using VITE_API_URL:', apiUrl);
    
    return apiUrl;
  }
  
  // Se VITE_API_URL não estiver definida, usar detecção automática APENAS como fallback
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    console.warn('[API] VITE_API_URL not set, using auto-detection for:', hostname);
    
    // Se for Vercel, tentar substituir homefix-frontend por homefix-backend
    if (hostname.includes('homefix-frontend') || hostname.includes('vercel.app')) {
      // Tentar padrão Vercel primeiro
      if (hostname.includes('homefix-frontend')) {
        const backendUrl = hostname.replace('homefix-frontend', 'homefix-backend');
        console.warn('[API] Auto-detected Vercel backend:', `https://${backendUrl}/api`);
        return `https://${backendUrl}/api`;
      }
      // Se não encontrar, avisar para configurar VITE_API_URL
      console.error('[API] Could not auto-detect backend. Please set VITE_API_URL in Vercel.');
    }
    
    // Se for Railway ou outro domínio, avisar para configurar
    if (hostname.includes('railway.app') || hostname.includes('railway.internal')) {
      console.error('[API] Railway detected. Please set VITE_API_URL in Vercel.');
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
