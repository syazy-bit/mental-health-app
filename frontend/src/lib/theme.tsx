'use client';

import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'mh_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Deterministic initial state for SSR and initial hydration pass
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => {
      setMounted(true);

      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      const initialTheme: ThemeMode =
        saved === 'light' || saved === 'dark' ? saved : 'light';

      setThemeState(initialTheme);

      const root = document.documentElement;
      const applyTheme = (currentMode: ThemeMode) => {
        const active = currentMode === 'dark' ? 'dark' : 'light';
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
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    startTransition(() => {
      const mode = newTheme === 'dark' ? 'dark' : 'light';
      setThemeState(mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Handle private mode or quota errors safely
      }

      const root = document.documentElement;
      setResolvedTheme(mode);

      if (mode === 'dark') {
        root.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    });
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const cycleTheme = () => {
    toggleTheme();
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme, cycleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      resolvedTheme: 'light',
      setTheme: () => {},
      toggleTheme: () => {},
      cycleTheme: () => {},
      mounted: false,
    };
  }
  return context;
}
