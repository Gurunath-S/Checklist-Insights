import { create } from 'zustand';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

export const useAuthStore = create((set) => ({
  user: (() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  })(),
  loading: !!localStorage.getItem('token'),
  isValidatingSession: !!localStorage.getItem('token'),
  loginError: null,
  isGoogleLoading: false,
  isMicrosoftLoading: false,

  setUser: (user) => {
    set((state) => {
      if (state.user?.id === user?.id && state.user !== null && user !== null) {
        return {};
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
      return { user };
    });
  },
  setLoading: (loading) => set({ loading }),
  setIsValidatingSession: (isValidatingSession) => set({ isValidatingSession }),
  setLoginError: (loginError) => set({ loginError }),
  setGoogleLoading: (isGoogleLoading) => set({ isGoogleLoading }),
  setMicrosoftLoading: (isMicrosoftLoading) => set({ isMicrosoftLoading }),
  
  googleLogin: async (credentialResponse) => {
    try {
      const { credential, access_token } = credentialResponse;
      const tokenToSend = credential || access_token;
      const isAccessToken = !!access_token;
      
      const res = await axios.post(`${API_BASE}/auth/google`, { 
         token: tokenToSend,
         isAccessToken
      });
      const { token, user: loggedUser } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      set({ user: loggedUser, loginError: null });
      return loggedUser;
    } catch (err) {
      console.error('Google Login Failed:', err);
      const errMsg = err.response?.data?.error || 'Login failed. Please check backend connection.';
      set({ loginError: errMsg });
      throw err;
    }
  },

  microsoftLogin: async (accessToken) => {
    try {
      const res = await axios.post(`${API_BASE}/auth/microsoft`, { 
        accessToken 
      });
      const { token, user: loggedUser } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      set({ user: loggedUser, loginError: null });
      return loggedUser;
    } catch (err) {
      console.error('Microsoft Login Failed:', err);
      const errMsg = err.response?.data?.error || err.message;
      set({ loginError: `Microsoft Login failed: ${errMsg}` });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, loading: false });
  }
}));
