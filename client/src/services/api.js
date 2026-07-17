import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

API.interceptors.request.use(
  (config) => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    if (userInfo && userInfo.token) {
      config.headers.Authorization = `Bearer ${userInfo.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const getBackendBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return apiUrl.replace(/\/api\/?$/, '');
};

export const resolveUploadUrl = (url) => {
  if (!url) return '';
  
  // If it's already an absolute URL (but not localhost:5000), return it as is
  if (url.startsWith('http') && !url.includes('localhost:5000')) {
    return url;
  }
  
  const base = getBackendBaseUrl();
  
  // If it starts with localhost:5000/uploads/ or localhost/uploads/
  if (url.includes('localhost:5000/uploads/')) {
    const filename = url.split('/uploads/')[1];
    return `${base}/uploads/${filename}`;
  }
  if (url.includes('localhost/uploads/')) {
    const filename = url.split('/uploads/')[1];
    return `${base}/uploads/${filename}`;
  }
  
  // If it's a relative path starting with /uploads/ or uploads/
  if (url.startsWith('/uploads/')) {
    return `${base}${url}`;
  }
  if (url.startsWith('uploads/')) {
    return `${base}/${url}`;
  }
  
  // If it's just the filename (not starting with http, /, data:)
  if (!url.startsWith('http') && !url.startsWith('/') && !url.startsWith('data:')) {
    return `${base}/uploads/${url}`;
  }
  
  return url;
};

export default API;
