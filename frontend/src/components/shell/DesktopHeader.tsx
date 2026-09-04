'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';
import { useAuth } from '@/components/auth/AuthProvider';
import { SessionModeBadge } from '@/components/auth/SessionModeBadge';

const AuthControls: React.FC = () => {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  // While auth is initializing, render nothing extra so logged-in users
  // never see a flash of the anonymous sign-in links.
  if (status === 'initializing' || status === 'authenticating') {
    return null;
  }

  if (user) {
    const label = user.display_name || user.email;
    const handleLogout = async () => {
      if (isLoggingOut) return;
      setIsLoggingOut(true);
      try {
        await logout();
      } finally {
        setIsLoggingOut(false);
        router.replace('/');
      }
    };
    return (
      <div className="flex items-center gap-2 shrink-0">
        <SessionModeBadge className="hidden lg:inline-flex" />
        <span
          className="hidden sm:inline max-w-32 truncate text-xs sm:text-sm font-medium text-[#5A6D65] dark:text-[#9FB1A9]"
          title={user.email}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border border-[#E5DEC7] dark:border-[#283C33] text-[#5A6D65] dark:text-[#9FB1A9] hover:text-[#182C24] dark:hover:text-[#F3F7F5] hover:bg-black/5 dark:hover:bg-white/5 transition-all focus-accessible select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Link
        href="/login"
        className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-[#0E5A54] dark:text-[#57ADA3] hover:bg-[#F0F9F8] dark:hover:bg-[#142825] transition-all focus-accessible select-none"
      >
        Log in
      </Link>
      <Link
        href="/register"
        className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border border-[#0E5A54] dark:border-[#57ADA3] text-[#0E5A54] dark:text-[#57ADA3] hover:bg-[#F0F9F8] dark:hover:bg-[#142825] transition-all focus-accessible select-none"
      >
        Sign up
      </Link>
    </div>
  );
};

export const DesktopHeader: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/chat', label: 'Talk & Reflect' },
    { href: '/screening', label: 'Self-Assessment' },
    // Authenticated-only: anonymous visitors never see account history nav.
    ...(user ? [{ href: '/check-ins', label: 'My Check-ins' }] : []),
    { href: '/booking', label: 'Counseling' },
    { href: '/resources', label: 'Resources' },
    { href: '/about', label: 'About & Privacy' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 dark:bg-[#121B17]/90 backdrop-blur-md border-b border-[#E8E2D5]/80 dark:border-[#24342C]/80 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo with Rounded Teal 'M' Box + Title/Subtitle */}
        <Link
          href="/"
          className="flex items-center gap-3 focus-accessible rounded-2xl p-1 -ml-1 group select-none shrink-0"
        >
          {/* [ M ] Icon */}
          <div className="w-10 h-10 rounded-xl bg-[#143D32] dark:bg-[#205244] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform duration-200">
            <span className="font-serif font-bold text-xl leading-none tracking-tight">M</span>
          </div>
          {/* Brand Titles */}
          <div className="flex flex-col text-left">
            <span className="font-serif font-bold text-[#182C24] dark:text-[#F3F7F5] text-lg tracking-tight leading-tight">
              MindBridge
            </span>
            <span className="text-[11px] font-medium text-[#687C74] dark:text-[#9FB1A9] tracking-normal leading-none mt-0.5">
              Student Well-being
            </span>
          </div>
        </Link>

        {/* Centered Navigation Links with Pill Style */}
        {/* overflow-x-auto (resources pill-row pattern): the pill bar shrinks
            and scrolls instead of pushing brand/actions off-screen when
            signed-in links plus account state exceed the width. Rendering is
            unchanged wherever everything already fits. */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1.5 lg:gap-2 overflow-x-auto bg-[#EFEAE1]/60 dark:bg-[#192721]/60 p-1.5 rounded-full border border-[#E5DEC7]/50 dark:border-[#283C33]/50">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 focus-accessible ${
                  isActive
                    ? 'bg-white dark:bg-[#23352D] text-[#143D32] dark:text-[#F3F7F5] font-semibold shadow-xs'
                    : 'text-[#5A6D65] dark:text-[#9FB1A9] hover:text-[#182C24] dark:hover:text-[#F3F7F5] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls: Auth, Theme Switcher & Terracotta Pill CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <AuthControls />
          <ThemeSwitcher />
          <Link
            href="/support-now"
            className="inline-flex items-center justify-center px-5 py-2 rounded-full text-xs sm:text-sm font-semibold bg-[#C5592D] hover:bg-[#B34D23] active:bg-[#9B411C] text-white shadow-xs hover:shadow-sm transition-all duration-200 active:scale-95 focus-accessible select-none"
          >
            Support Now
          </Link>
        </div>
      </div>
    </header>
  );
};
