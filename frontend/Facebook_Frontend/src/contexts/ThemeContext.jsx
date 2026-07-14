import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';

const ThemeContext = createContext(null);

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('app_theme_mode') || 'light';
    } catch {
      return 'light';
    }
  });

  // useLayoutEffect fires synchronously before browser paint — no flash on reload
  useLayoutEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('app_theme_mode', theme);
    } catch {
      // localStorage unavailable (private mode, storage full)
    }
  }, [theme]);

  // Keep 'auto' in sync when the OS preference changes
  useEffect(() => {
    if (theme !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('auto');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const toggleTheme = (newTheme) => {
    if (['light', 'dark', 'auto'].includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  const isDark =
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
