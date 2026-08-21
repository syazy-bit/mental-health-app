'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'mh_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Deterministic initial state for SSR and initial hydration pass
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      setMounted(true);

      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      const initialTheme: ThemeMode =
        saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';

      setThemeState(initialTheme);

      const root = document.documentElement;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const applyTheme = (currentMode: ThemeMode) => {
        const active = currentMode === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : currentMode;
        setResolvedTheme(active);

        if (active === 'dark') {
          root.classList.add('dark');
          root.setAttribute('data-theme', 'dark');
        } else {
          root.classList.remove('dark');
          root.setAttribute('data-theme', 'light');
        }
      };

      applyTheme(initialTheme);
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const currentStored = (localStorage.getItem(STORAGE_KEY) as ThemeMode | null) || 'system';
      if (currentStored === 'system') {
        const active = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(active);
        const root = document.documentElement;
        if (active === 'dark') {
          root.classList.add('dark');
          root.setAttribute('data-theme', 'dark');
        } else {
          root.classList.remove('dark');
          root.setAttribute('data-theme', 'light');
        }
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    startTransition(() => {
      setThemeState(newTheme);
      try {
        localStorage.setItem(STORAGE_KEY, newTheme);
      } catch {
        // Handle private mode or quota errors safely
      }

      const root = document.documentElement;
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const active = newTheme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : newTheme;
      setResolvedTheme(active);

      if (active === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    });
  };

  const cycleTheme = () => {
    const next: Record<ThemeMode, ThemeMode> = {
      system: 'light',
      light: 'dark',
      dark: 'system',
    };
    setTheme(next[theme]);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: () => {},
      cycleTheme: () => {},
      mounted: false,
    };
  }
  return context;
}
