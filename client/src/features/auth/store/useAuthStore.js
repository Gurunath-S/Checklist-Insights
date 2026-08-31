import { create } from 'zustand';
import { googleLoginApi, microsoftLoginApi } from '../services/authService';
import apiClient, { setAccessToken } from '../../../services/apiClient';

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
  loading: true,
  isValidatingSession: true,
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
      
      const data = await googleLoginApi(tokenToSend, isAccessToken);
      const { token, user: loggedUser } = data;
      
      setAccessToken(token);
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
      const data = await microsoftLoginApi(accessToken);
      const { token, user: loggedUser } = data;
      
      setAccessToken(token);
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

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout error on server:', err);
    } finally {
      setAccessToken(null);
      localStorage.removeItem('user');
      set({ user: null, loading: false });
    }
  },

  logoutAll: async () => {
    try {
      await apiClient.post('/auth/logout-all');
    } catch (err) {
      console.error('Logout all error on server:', err);
    } finally {
      setAccessToken(null);
      localStorage.removeItem('user');
      set({ user: null, loading: false });
    }
  }
}));
