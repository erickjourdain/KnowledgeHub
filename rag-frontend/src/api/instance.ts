import axios from 'axios';

const getApiBaseUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (!apiUrl) return 'http://localhost:5000/api';
  
  // If it's a relative URL (starts with '/' but not '//')
  if (apiUrl.startsWith('/') && !apiUrl.startsWith('//')) {
    return apiUrl;
  }
  
  // If it already has a protocol, or starts with '//'
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://') || apiUrl.startsWith('//')) {
    return apiUrl;
  }
  
  // Fallback
  return `http://${apiUrl}`;
};

const instance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use(
  (config) => {
    const token = JSON.parse(localStorage.getItem('auth-token') || "null");
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      delete config.headers['Authorization'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;