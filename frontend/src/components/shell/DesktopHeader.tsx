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
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 dark:bg-[#101817]/90 backdrop-blur-md border-b border-[#E6E4DD] dark:border-[#283632]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-accessible rounded-xl p-1 -ml-1 group select-none shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-[#0D5C56] dark:bg-[#4FA79D] flex items-center justify-center text-white dark:text-[#101817] font-bold text-base shadow-2xs group-hover:bg-[#115E59] dark:group-hover:bg-[#61B8AE] transition-colors">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[#19232D] dark:text-[#F1F3EF] text-base leading-tight tracking-tight">
              MindBridge
            </span>
            <span className="text-[11px] text-slate-500 dark:text-[#AAB6B1] font-medium tracking-tight">
              Student Well-being
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1 lg:gap-1.5">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors focus-accessible ${
                  isActive
                    ? 'bg-[#0D5C56]/10 dark:bg-[#4FA79D]/15 text-[#0D5C56] dark:text-[#4FA79D]'
                    : 'text-slate-600 dark:text-[#AAB6B1] hover:text-[#19232D] dark:hover:text-[#F1F3EF] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls: Theme Switcher & Persistent Emergency CTA */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeSwitcher />
          <Link
            href="/support-now"
            className="inline-flex items-center justify-center px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#D97706] dark:bg-[#E7A044] hover:bg-[#B45309] dark:hover:bg-[#F0B260] active:bg-[#92400E] text-white dark:text-[#101817] shadow-2xs transition-all focus-accessible touch-target select-none"
          >
            Get Help Now
          </Link>
        </div>
      </div>
    </header>
  );
};
