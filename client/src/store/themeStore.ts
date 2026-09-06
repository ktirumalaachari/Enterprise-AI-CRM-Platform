import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('crm_theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'light';
};

export const applyThemeToDOM = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    const body = document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      if (body) body.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      if (body) body.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }
};

// Apply on startup immediately
const initialTheme = getInitialTheme();
applyThemeToDOM(initialTheme);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initialTheme,

  toggleTheme: () =>
    set((state) => {
      const nextTheme: Theme = state.theme === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('crm_theme', nextTheme);
      } catch {
        // ignore
      }
      applyThemeToDOM(nextTheme);
      return { theme: nextTheme };
    }),

  setTheme: (theme: Theme) =>
    set(() => {
      try {
        localStorage.setItem('crm_theme', theme);
      } catch {
        // ignore
      }
      applyThemeToDOM(theme);
      return { theme };
    }),
}));

export default useThemeStore;
