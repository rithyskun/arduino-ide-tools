'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  type Theme,
  loadTheme,
  saveTheme,
  applyTheme,
  resolveTheme,
  type ResolvedTheme,
} from '@/lib/theme';

interface ThemeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolved: 'dark',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<ResolvedTheme>('dark');

  // Set theme + persist + update DOM
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    saveTheme(t);
    applyTheme(t);
    setResolved(resolveTheme(t));
  }, []);

  // Init from localStorage on mount
  useEffect(() => {
    const saved = loadTheme();
    setThemeState(saved);
    applyTheme(saved);
    setResolved(resolveTheme(saved));
  }, []);

  // Watch system preference changes when theme === 'system'
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (theme === 'system') {
        applyTheme('system');
        setResolved(resolveTheme('system'));
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
