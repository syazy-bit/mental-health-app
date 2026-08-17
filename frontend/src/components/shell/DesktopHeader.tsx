'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const DesktopHeader: React.FC = () => {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/chat', label: 'Talk (AI Support)' },
    { href: '/screening', label: 'Check-in (Screening)' },
    { href: '/resources', label: 'Resources' },
    { href: '/about', label: 'About & Privacy' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-accessible rounded-lg p-1 group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#0F766E] flex items-center justify-center text-white font-bold text-lg shadow-xs group-hover:bg-[#115E59] transition-colors">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 text-base leading-tight tracking-tight">
              MindBridge
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              Student Well-being
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Main Navigation" className="hidden md:flex items-center gap-1 lg:gap-2">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors focus-accessible ${
                  isActive
                    ? 'bg-[#0F766E]/10 text-[#0F766E] font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Persistent Get Help Now button */}
        <div className="flex items-center gap-3">
          <Link
            href="/support-now"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold bg-[#D97706] hover:bg-[#B45309] text-white shadow-xs transition-colors focus-accessible touch-target"
          >
            Get Help Now
          </Link>
        </div>
      </div>
    </header>
  );
};
