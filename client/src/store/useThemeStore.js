import { create } from 'zustand';

export const useThemeStore = create((set) => ({
  theme: (() => {
    const savedUserStr = localStorage.getItem('user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.id) {
          return localStorage.getItem(`theme_${savedUser.id}`) || 'classic';
        }
      } catch (e) {
        console.error(e);
      }
    }
    return localStorage.getItem('theme') || 'classic';
  })(),
  themeChangedOnLogin: false,

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const savedUserStr = localStorage.getItem('user');
    if (savedUserStr) {
      try {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser && savedUser.id) {
          localStorage.setItem(`theme_${savedUser.id}`, theme);
        }
      } catch (e) {
        console.error(e);
      }
    }
    set({ theme });
  },
  setThemeChangedOnLogin: (themeChangedOnLogin) => set({ themeChangedOnLogin }),
  
  syncUserTheme: (userId) => {
    if (userId) {
      const userTheme = localStorage.getItem(`theme_${userId}`) || localStorage.getItem('theme') || 'classic';
      document.documentElement.setAttribute('data-theme', userTheme);
      set({ theme: userTheme });
    }
  }
}));
