'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme, ThemeMode } from '@/lib/theme';

export interface ThemeSwitcherProps {
  variant?: 'button' | 'segmented';
  className?: string;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = 'button',
  className = '',
}) => {
  const { theme, resolvedTheme, setTheme, cycleTheme, mounted } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Keyboard navigation & accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
          if (e.key !== ' ') e.preventDefault();
          setIsOpen(true);
          setTimeout(() => {
            menuItemsRef.current[0]?.focus();
          }, 0);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const activeIdx = menuItemsRef.current.findIndex((el) => el === document.activeElement);
        const nextIdx = (activeIdx + 1) % 3;
        menuItemsRef.current[nextIdx]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const activeIdx = menuItemsRef.current.findIndex((el) => el === document.activeElement);
        const prevIdx = (activeIdx - 1 + 3) % 3;
        menuItemsRef.current[prevIdx]?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        menuItemsRef.current[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        menuItemsRef.current[2]?.focus();
      } else if (e.key === 'Tab') {
        setIsOpen(false);
      }
    },
    [isOpen]
  );

  const SunIcon = (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );

  const MoonIcon = (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );

  const SystemIcon = (
    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );

  if (variant === 'segmented') {
    const options: { mode: ThemeMode; label: string; icon: React.ReactNode }[] = [
      { mode: 'light', label: 'Light', icon: SunIcon },
      { mode: 'dark', label: 'Dark', icon: MoonIcon },
      { mode: 'system', label: 'System', icon: SystemIcon },
    ];

    return (
      <div
        role="group"
        aria-label="Theme mode selection"
        className={`inline-flex items-center p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[#E6E4DD] dark:border-[#283632] ${className}`}
      >
        {options.map((opt) => {
          const isSelected = mounted ? theme === opt.mode : opt.mode === 'system';
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTheme(opt.mode)}
              aria-pressed={isSelected}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus-accessible ${
                isSelected
                  ? 'bg-white dark:bg-[#202B28] text-[#19232D] dark:text-[#F1F3EF] shadow-2xs'
                  : 'text-slate-500 dark:text-[#AAB6B1] hover:text-[#19232D] dark:hover:text-[#F1F3EF]'
              }`}
            >
              <span className="shrink-0">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default compact button with accessible cycling & dropdown
  // During SSR & initial hydration, render deterministic placeholder
  const currentIcon = !mounted ? SunIcon : resolvedTheme === 'dark' ? MoonIcon : SunIcon;
  const themeLabel = !mounted
    ? 'Theme'
    : theme === 'system'
    ? `System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`
    : theme === 'dark'
    ? 'Dark'
    : 'Light';

  const buttonAriaLabel = !mounted
    ? 'Theme setting. Click to choose theme.'
    : `Theme setting: ${themeLabel}. Click to choose theme.`;

  const buttonTitle = !mounted ? 'Theme' : `Theme: ${themeLabel}`;

  const handleSetTheme = (mode: ThemeMode) => {
    try {
      document.documentElement.classList.add('theme-transitioning');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
    } catch {}
    setTheme(mode);
    setIsOpen(false);
  };

  const handleCycleTheme = () => {
    try {
      document.documentElement.classList.add('theme-transitioning');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
    } catch {}
    cycleTheme();
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onDoubleClick={(e) => {
          e.preventDefault();
          handleCycleTheme();
        }}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={buttonAriaLabel}
        title={buttonTitle}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-[#AAB6B1] hover:text-[#19232D] dark:hover:text-[#F1F3EF] hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-[#E8E5DC] dark:hover:border-[#253633] transition-all duration-200 active:scale-90 focus-accessible touch-target cursor-pointer select-none"
      >
        <span key={resolvedTheme} className="animate-icon-pop">
          {currentIcon}
        </span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-36 rounded-2xl bg-white/95 dark:bg-[#162220]/95 backdrop-blur-xl border border-[#E8E5DC] dark:border-[#253633] shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            ref={(el) => { menuItemsRef.current[0] = el; }}
            type="button"
            role="menuitem"
            onClick={() => {
              handleSetTheme('light');
              triggerRef.current?.focus();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95 focus-accessible ${
              mounted && theme === 'light'
                ? 'bg-[#0E5A54]/10 text-[#0E5A54] dark:bg-[#57ADA3]/15 dark:text-[#57ADA3]'
                : 'text-[#1A242B] dark:text-[#F1F5F3] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span className="shrink-0">{SunIcon}</span>
            <span>Light</span>
          </button>
          <button
            ref={(el) => { menuItemsRef.current[1] = el; }}
            type="button"
            role="menuitem"
            onClick={() => {
              handleSetTheme('dark');
              triggerRef.current?.focus();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95 focus-accessible ${
              mounted && theme === 'dark'
                ? 'bg-[#0E5A54]/10 text-[#0E5A54] dark:bg-[#57ADA3]/15 dark:text-[#57ADA3]'
                : 'text-[#1A242B] dark:text-[#F1F5F3] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span className="shrink-0">{MoonIcon}</span>
            <span>Dark</span>
          </button>
          <button
            ref={(el) => { menuItemsRef.current[2] = el; }}
            type="button"
            role="menuitem"
            onClick={() => {
              handleSetTheme('system');
              triggerRef.current?.focus();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-150 active:scale-95 focus-accessible ${
              mounted && theme === 'system'
                ? 'bg-[#0E5A54]/10 text-[#0E5A54] dark:bg-[#57ADA3]/15 dark:text-[#57ADA3]'
                : 'text-[#1A242B] dark:text-[#F1F5F3] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span className="shrink-0">{SystemIcon}</span>
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
};
