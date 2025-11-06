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

// Initialize API URL synchronously if possible
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
      if (import.meta.env.DEV) {
        console.log('[API] Using VITE_API_URL:', apiUrl);
      }
      return true;
    }
    
    // Auto-detect in production
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      if (hostname.includes('home-fix-beta') || 
          hostname.includes('homefix-frontend') || 
          hostname.includes('homefixfrontend')) {
        api.defaults.baseURL = 'https://homefix-production.up.railway.app/api';
        if (import.meta.env.DEV) {
          console.log('[API] Auto-detected Railway backend for:', hostname);
        }
        return true;
      }
    }
    
    // Keep default
    if (import.meta.env.DEV) {
      console.log('[API] Using default base URL:', DEFAULT_BASE_URL);
    }
    return false;
  } catch (e) {
    console.error('[API] Error initializing URL:', e);
    return false;
  }
}

// Try to initialize immediately if window is available
let urlInitialized = false;
if (typeof window !== 'undefined') {
  // Try synchronous initialization first
  urlInitialized = initializeApiUrl();
  
  // If not initialized, try again after DOM is ready
  if (!urlInitialized) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initializeApiUrl();
    } else {
      document.addEventListener('DOMContentLoaded', initializeApiUrl);
      setTimeout(() => initializeApiUrl(), 100);
    }
  }
} else {
  // SSR - initialize immediately
  initializeApiUrl();
}

// Request interceptor
api.interceptors.request.use((config) => {
  // Ensure URL is set before each request - always check
  if (typeof window !== 'undefined') {
    const wasInitialized = initializeApiUrl();
    if (wasInitialized && config.baseURL === DEFAULT_BASE_URL) {
      // Re-initialize if needed
      config.baseURL = api.defaults.baseURL;
    }
  }
  
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Log request details (always log in production for debugging)
  const fullUrl = (config.baseURL || '') + (config.url || '');
  console.log('[API] Making request:', config.method?.toUpperCase(), config.url);
  console.log('[API] Full URL:', fullUrl);
  if (config.data && !config.url.includes('/auth/login')) {
    // Don't log password data
    console.log('[API] Request data:', config.data);
  }
  
  return config;
}, (error) => {
  console.error('[API] Request interceptor error:', error);
  return Promise.reject(error);
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const fullUrl = error.config ? (error.config.baseURL || '') + (error.config.url || '') : 'unknown';
    console.error('[API] Request error:', error.message);
    console.error('[API] Failed URL:', fullUrl);
    console.error('[API] Status:', error.response?.status);
    console.error('[API] Status text:', error.response?.statusText);
    if (error.response?.data) {
      console.error('[API] Response data:', error.response.data);
    }
    if (error.response?.headers) {
      console.error('[API] Response headers:', error.response.headers);
    }
    return Promise.reject(error);
  }
);

export default api;
