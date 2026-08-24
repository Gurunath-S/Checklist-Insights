import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE,
});

let globalLogout = null;

export const setGlobalLogout = (logoutFn) => {
  globalLogout = logoutFn;
};

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      if (globalLogout) {
        globalLogout();
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
