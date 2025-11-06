import axios from 'axios';

let cachedApiUrl = null;

const getApiUrl = () => {
  if (cachedApiUrl) {
    return cachedApiUrl;
  }

  try {
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
      cachedApiUrl = apiUrl;
      return apiUrl;
    }
    
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      console.warn('[API] VITE_API_URL not set, using auto-detection for:', hostname);
      
      if (hostname.includes('home-fix-beta') || hostname.includes('homefix-frontend') || hostname.includes('homefixfrontend') || hostname.includes('vercel.app')) {
        if (hostname.includes('home-fix-beta') || hostname.includes('homefix-frontend') || hostname.includes('homefixfrontend')) {
          console.warn('[API] Vercel frontend detected. Using Railway backend.');
          cachedApiUrl = 'https://homefix-production.up.railway.app/api';
          return cachedApiUrl;
        }
        console.error('[API] Could not auto-detect backend. Please set VITE_API_URL in Vercel.');
      }
      
      if (hostname.includes('railway.app') || hostname.includes('railway.internal')) {
        console.error('[API] Railway detected. Please set VITE_API_URL in Vercel.');
      }
    }
    
    cachedApiUrl = '/api';
    return cachedApiUrl;
  } catch (e) {
    console.error('[API] Error getting API URL:', e);
    return '/api';
  }
};

// Initialize with default, will be updated on first request if needed
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Ensure baseURL is set correctly before first request
let baseUrlInitialized = false;
const ensureBaseUrl = () => {
  if (!baseUrlInitialized) {
    try {
      const url = getApiUrl();
      if (url && url !== api.defaults.baseURL) {
        api.defaults.baseURL = url;
        console.log('[API] Base URL initialized to:', api.defaults.baseURL);
      }
      baseUrlInitialized = true;
    } catch (e) {
      console.error('[API] Error initializing base URL:', e);
    }
  }
};

// Initialize immediately if window is available, otherwise wait
if (typeof window !== 'undefined') {
  // Use requestAnimationFrame to ensure DOM is ready
  if (window.requestAnimationFrame) {
    window.requestAnimationFrame(ensureBaseUrl);
  } else {
    setTimeout(ensureBaseUrl, 0);
  }
} else {
  ensureBaseUrl();
}

api.interceptors.request.use((config) => {
  // Ensure baseURL is set before each request
  ensureBaseUrl();
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log('[API] Making request:', config.method?.toUpperCase(), config.url);
  console.log('[API] Full URL:', config.baseURL + config.url);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('[API] Error:', error.message);
    console.error('[API] Error URL:', error.config?.url);
    console.error('[API] Error Full URL:', error.config?.baseURL + error.config?.url);
    if (error.response) {
      console.error('[API] Error Response Status:', error.response.status);
      console.error('[API] Error Response Headers:', error.response.headers);
    }
    return Promise.reject(error);
  }
);

export default api;
