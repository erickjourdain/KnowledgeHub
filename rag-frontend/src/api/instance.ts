import axios from 'axios';

const instance = axios.create({
  baseURL: `http:${import.meta.env.VITE_API_URL}` || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

instance.interceptors.request.use(
  (config) => {
    const token = JSON.parse(localStorage.getItem('auth-token') || "null");
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;