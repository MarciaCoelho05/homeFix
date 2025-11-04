import axios from 'axios';

const getApiUrl = () => {
  // Se VITE_API_URL estiver definida, usar ela (prioridade máxima)
  if (import.meta.env.VITE_API_URL) {
    let apiUrl = import.meta.env.VITE_API_URL.trim();
    
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
    
    return apiUrl;
  }
  
  // Em produção, detectar automaticamente o backend
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Se for Vercel, tentar substituir homefix-frontend por homefix-backend
    if (hostname.includes('homefix-frontend') || hostname.includes('vercel.app')) {
      // Tentar padrão Vercel primeiro
      if (hostname.includes('homefix-frontend')) {
        const backendUrl = hostname.replace('homefix-frontend', 'homefix-backend');
        return `https://${backendUrl}/api`;
      }
      // Se não encontrar, pode ser que o backend esteja no Railway
      // Nesse caso, VITE_API_URL deve ser configurada no Vercel
      console.warn('Backend não encontrado automaticamente. Configure VITE_API_URL no Vercel.');
    }
    
    // Se for Railway ou outro domínio, VITE_API_URL deve estar configurada
    if (hostname.includes('railway.app') || hostname.includes('railway.internal')) {
      console.warn('Backend no Railway detectado. Configure VITE_API_URL no Vercel.');
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
