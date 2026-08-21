'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DisclaimerStrip } from './DisclaimerStrip';
import { DesktopHeader } from './DesktopHeader';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-[#CCFBF1] selection:text-[#0D5C56] dark:selection:bg-[#1A3734] dark:selection:text-[#4FA79D]">
      {/* Skip to Content Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Top Disclaimer & 24/7 Helpline Link */}
      <DisclaimerStrip />

      {/* Header */}
      <DesktopHeader />

      {/* Main Content Area with Smooth Page Transition */}
      <main
        id="main-content"
        key={pathname}
        tabIndex={-1}
        className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-28 md:pb-14 outline-none animate-page-enter"
      >
        {children}
      </main>

      {/* Institutional Footer */}
      <footer className="hidden md:block bg-stone-100/80 dark:bg-[#141C1A] border-t border-[#E6E4DD] dark:border-[#283632] py-10 px-4 text-slate-500 dark:text-[#AAB6B1] text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left max-w-lg">
            <p className="font-bold text-[#19232D] dark:text-[#F1F3EF] text-sm">
              MindBridge Student Well-being Platform
            </p>
            <p className="leading-relaxed text-slate-500 dark:text-[#AAB6B1]">
              A confidential, zero-registration support space for university students. Provides supportive active listening, stress coping tools, and clinical self-screenings. Not a substitute for formal psychiatric diagnosis or emergency medical healthcare.
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2 text-center sm:text-right shrink-0">
            <div className="flex items-center gap-3 font-semibold text-slate-600 dark:text-[#AAB6B1]">
              <Link
                href="/about"
                className="hover:text-[#0D5C56] dark:hover:text-[#4FA79D] transition-colors focus-accessible rounded-md p-1"
              >
                About &amp; Privacy
              </Link>
              <span>&bull;</span>
              <Link
                href="/support-now"
                className="text-[#D97706] dark:text-[#E7A044] hover:text-[#B45309] dark:hover:text-[#F0B260] transition-colors focus-accessible rounded-md p-1"
              >
                Emergency Contacts
              </Link>
              <span>&bull;</span>
              <Link
                href="/admin/login"
                className="hover:text-[#0D5C56] dark:hover:text-[#4FA79D] transition-colors focus-accessible rounded-md p-1"
              >
                Admin Portal
              </Link>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#73827D]">
              &copy; {new Date().getFullYear()} University Student Counseling Service. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};
