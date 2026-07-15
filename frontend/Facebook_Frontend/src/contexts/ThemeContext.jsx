import { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { STORAGE_KEYS } from '../shared/generated/constants';

const ThemeContext = createContext(null);
const LEGACY_DARK_MODE_KEY = 'fb_dark_mode';
const VALID_THEMES = ['light', 'dark', 'auto'];

function getStoredTheme() {
  try {
    const legacyDarkMode = localStorage.getItem(LEGACY_DARK_MODE_KEY);
    if (legacyDarkMode === 'true') return 'dark';
    if (legacyDarkMode === 'false') return 'light';

    const storedTheme = localStorage.getItem(STORAGE_KEYS.themeMode);
    if (VALID_THEMES.includes(storedTheme)) {
      return storedTheme;
    }
  } catch {
    // localStorage unavailable (private mode, storage full)
  }

  return 'light';
}

function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.themeMode, theme);
    localStorage.removeItem(LEGACY_DARK_MODE_KEY);
  } catch {
    // localStorage unavailable (private mode, storage full)
  }
}

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
  const [theme, setTheme] = useState(getStoredTheme);

  // useLayoutEffect fires synchronously before browser paint — no flash on reload
  useLayoutEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
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
    if (VALID_THEMES.includes(newTheme)) {
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
