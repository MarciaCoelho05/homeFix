import axios from 'axios';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    let apiUrl = String(import.meta.env.VITE_API_URL).trim();
    
    apiUrl = apiUrl.replace(/^\//, '');
    
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      apiUrl = `https://${apiUrl}`;
    }
    
    apiUrl = apiUrl.replace(/\/+$/, '');
    
    if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl}/api`;
    }
    
    console.log('[API] Using VITE_API_URL:', apiUrl);
    
    return apiUrl;
  }
  
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    console.warn('[API] VITE_API_URL not set, using auto-detection for:', hostname);
    
    if (hostname.includes('homefix-frontend') || hostname.includes('vercel.app')) {
      if (hostname.includes('homefix-frontend')) {
        const backendUrl = hostname.replace('homefix-frontend', 'homefix-backend');
        console.warn('[API] Auto-detected Vercel backend:', `https://${backendUrl}/api`);
        return `https://${backendUrl}/api`;
      }
      console.error('[API] Could not auto-detect backend. Please set VITE_API_URL in Vercel.');
    }
    
    if (hostname.includes('railway.app') || hostname.includes('railway.internal')) {
      console.error('[API] Railway detected. Please set VITE_API_URL in Vercel.');
    }
  }
  
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
