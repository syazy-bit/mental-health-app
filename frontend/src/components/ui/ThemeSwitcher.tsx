'use client';

import React from 'react';
import { useTheme } from '@/lib/theme';

export interface ThemeSwitcherProps {
  variant?: 'button' | 'segmented';
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  const handleToggle = () => {
    try {
      document.documentElement.classList.add('theme-transitioning');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
    } catch {}
    toggleTheme();
  };

  const SunIcon = (
    <svg
      className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45 text-[#D97706] dark:text-[#FBBF24]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );

  const MoonIcon = (
    <svg
      className="w-5 h-5 transition-transform duration-300 group-hover:-rotate-12 text-[#A3C9A8] dark:text-[#7EA68E]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );

  const isDark = mounted && resolvedTheme === 'dark';
  const ariaLabel = isDark ? 'Switch to Light theme' : 'Switch to Dark theme';
  const title = isDark ? 'Switch to Light (Sun)' : 'Switch to Dark (Moon)';

  if (variant === 'segmented') {
    return (
      <button
        type="button"
        onClick={handleToggle}
        aria-label={ariaLabel}
        title={title}
        className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFEAE1]/70 dark:bg-[#192721]/70 border border-[#E5DEC7]/60 dark:border-[#283C33]/60 text-xs font-semibold text-[#182C24] dark:text-[#F3F7F5] transition-all hover:shadow-2xs active:scale-95 cursor-pointer focus-accessible ${className}`}
      >
        <span className="shrink-0 animate-icon-pop">
          {isDark ? MoonIcon : SunIcon}
        </span>
        <span>{isDark ? 'Dark mode' : 'Light mode'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={ariaLabel}
      title={title}
      className={`group relative w-10 h-10 rounded-full flex items-center justify-center bg-[#EFEAE1]/60 hover:bg-white dark:bg-[#192721]/60 dark:hover:bg-[#20312A] border border-[#E5DEC7]/50 dark:border-[#283C33]/50 text-slate-700 dark:text-[#AAB6B1] hover:text-[#182C24] dark:hover:text-[#F3F7F5] shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-90 focus-accessible touch-target cursor-pointer select-none ${className}`}
    >
      <span key={isDark ? 'dark' : 'light'} className="animate-icon-pop">
        {isDark ? MoonIcon : SunIcon}
      </span>
    </button>
  );
};
