'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdminSession } from '@/components/admin/AdminGuard';
import { Button } from '@/components/ui/Button';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10"
        />
      </svg>
    ),
  },
  {
    href: '/admin/bookings',
    label: 'Bookings',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3M4 7h16v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7zm4 6h3v3H8v-3zm5 0h3v3h-3v-3z"
        />
      </svg>
    ),
  },
  {
    href: '/admin/counselors',
    label: 'Counselors',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-2-7.5 4 4 0 002 7.5zm-8 1.13a3 3 0 10-2-5.62 3 3 0 002 5.62z"
        />
      </svg>
    ),
  },
  {
    href: '/admin/availability',
    label: 'Availability',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

const brandMark = (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5h18M3 5v10a2 2 0 002 2h4l-2 4h10l-2-4h4a2 2 0 002-2V5M7 10h10"
    />
  </svg>
);

export const AdminShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { admin, status, logout } = useAdminSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href));

  if (status !== 'ready') {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <svg
            className="animate-spin h-8 w-8 text-[#0F766E]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm font-medium">Checking your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-md focus-accessible"
      >
        Skip to main content
      </a>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2 font-bold text-[#0F766E]">
            {brandMark}
            <span>MindBridge Admin</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="admin-mobile-nav"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-slate-600 hover:bg-slate-100 focus-accessible touch-target"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {mobileOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
        {mobileOpen && (
          <nav
            id="admin-mobile-nav"
            aria-label="Admin navigation"
            className="border-t border-slate-200 bg-white px-2 py-2"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium touch-target ${
                  isActive(item.href)
                    ? 'bg-[#F0FDFA] text-[#0F766E]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 mt-2 pt-2">
              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-left font-medium text-slate-600 hover:bg-slate-100 touch-target"
              >
                Sign out
              </button>
            </div>
          </nav>
        )}
      </header>

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen">
          <div className="flex items-center gap-2 px-6 h-16 border-b border-slate-200 font-bold text-[#0F766E]">
            {brandMark}
            <span>MindBridge Admin</span>
          </div>
          <nav
            aria-label="Admin navigation"
            className="flex-1 px-3 py-4 space-y-1"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl font-medium ${
                  isActive(item.href)
                    ? 'bg-[#F0FDFA] text-[#0F766E]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-200 px-3 py-4 space-y-2">
            <div className="px-3">
              <p className="text-sm font-medium text-slate-900 truncate">
                {admin?.username ?? 'Admin'}
              </p>
              <p className="text-xs text-slate-500">Portal administrator</p>
            </div>
            <div className="px-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={logout}
              >
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        <main id="main-content" className="flex-1 min-w-0">
          <div className="hidden lg:flex items-center justify-end gap-4 px-8 h-16 border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
            <Link
              href="/"
              className="text-sm font-medium text-[#0F766E] hover:underline focus-accessible rounded"
            >
              View student site
            </Link>
          </div>
          <div className="px-4 sm:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};