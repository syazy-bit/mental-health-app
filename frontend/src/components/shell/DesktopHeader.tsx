'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeSwitcher } from '@/components/ui/ThemeSwitcher';

export const DesktopHeader: React.FC = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/chat', label: 'Talk & Reflect' },
    { href: '/screening', label: 'Check-in' },
    { href: '/booking', label: 'Counseling' },
    { href: '/resources', label: 'Resources' },
    { href: '/about', label: 'About & Privacy' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/85 dark:bg-[#0F1615]/85 backdrop-blur-xl border-b border-[#E8E5DC]/80 dark:border-[#253633]/80 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 focus-accessible rounded-2xl p-1 -ml-1 group select-none shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0E5A54] to-[#126D66] dark:from-[#57ADA3] dark:to-[#45938A] flex items-center justify-center text-white dark:text-[#0F1615] font-bold text-lg shadow-sm group-hover:scale-105 transition-transform duration-200">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-[#1A242B] dark:text-[#F1F5F3] text-base leading-tight tracking-tight">
              MindBridge
            </span>
            <span className="text-[11px] text-[#5D6E77] dark:text-[#9EAEA9] font-medium tracking-tight">
              Student Well-being
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1 lg:gap-1.5 bg-black/[0.03] dark:bg-white/[0.04] p-1 rounded-full border border-black/[0.04] dark:border-white/[0.05]">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95 focus-accessible ${
                  isActive
                    ? 'bg-white dark:bg-[#1C2B28] text-[#0E5A54] dark:text-[#57ADA3] shadow-xs'
                    : 'text-[#5D6E77] dark:text-[#9EAEA9] hover:text-[#1A242B] dark:hover:text-[#F1F5F3] hover:bg-white/50 dark:hover:bg-white/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls: Theme Switcher & Persistent Emergency CTA */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeSwitcher />
          <Link
            href="/support-now"
            className="inline-flex items-center justify-center px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#D97706] to-[#E58B44] hover:from-[#B45309] hover:to-[#D97706] text-white shadow-xs hover:shadow-md transition-all duration-200 active:scale-[0.98] focus-accessible select-none"
          >
            Support Now
          </Link>
        </div>
      </div>
    </header>
  );
};
