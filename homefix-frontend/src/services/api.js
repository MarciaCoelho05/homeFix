import axios from 'axios';

// Simple, safe initialization - no complex logic at module level
const DEFAULT_BASE_URL = '/api';

// Create axios instance with default immediately
const api = axios.create({
  baseURL: DEFAULT_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Initialize API URL after everything is loaded
function initializeApiUrl() {
  try {
    // Check environment variable first
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
      api.defaults.baseURL = apiUrl;
      console.log('[API] Using VITE_API_URL:', apiUrl);
      return;
    }
    
    // Auto-detect in production
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      if (hostname.includes('home-fix-beta') || 
          hostname.includes('homefix-frontend') || 
          hostname.includes('homefixfrontend')) {
        api.defaults.baseURL = 'https://homefix-production.up.railway.app/api';
        console.log('[API] Auto-detected Railway backend for:', hostname);
        return;
      }
    }
    
    // Keep default
    console.log('[API] Using default base URL:', DEFAULT_BASE_URL);
  } catch (e) {
    console.error('[API] Error initializing URL:', e);
    // Keep default on error
  }
}

// Initialize after DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Already loaded, initialize immediately
    setTimeout(initializeApiUrl, 0);
  } else {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', initializeApiUrl);
    // Fallback in case DOMContentLoaded already fired
    setTimeout(initializeApiUrl, 100);
  }
} else {
  // SSR - initialize immediately
  initializeApiUrl();
}

// Request interceptor
api.interceptors.request.use((config) => {
  // Ensure URL is set before each request
  if (config.baseURL === DEFAULT_BASE_URL && typeof window !== 'undefined') {
    initializeApiUrl();
  }
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[API] Request error:', error.message);
    if (error.config) {
      console.error('[API] Failed URL:', error.config.baseURL + error.config.url);
    }
    return Promise.reject(error);
  }
);

export default api;
