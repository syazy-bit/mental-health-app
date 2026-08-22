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
    { href: '/screening', label: 'Self-Assessment' },
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
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1.5 lg:gap-2 bg-[#EFEAE1]/60 dark:bg-[#192721]/60 p-1.5 rounded-full border border-[#E5DEC7]/50 dark:border-[#283C33]/50">
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

        {/* Action Controls: Theme Switcher & Terracotta Pill CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
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
