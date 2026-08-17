import React from 'react';
import Link from 'next/link';
import { DisclaimerStrip } from './DisclaimerStrip';
import { DesktopHeader } from './DesktopHeader';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-slate-800">
      {/* Skip to Content Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Top Disclaimer & Emergency Link */}
      <DisclaimerStrip />

      {/* Header */}
      <DesktopHeader />

      {/* Main Content Area */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-12 outline-none"
      >
        {children}
      </main>

      {/* Footer */}
      <footer className="hidden md:block bg-stone-100 border-t border-slate-200/80 py-8 px-4 text-slate-500 text-xs text-center">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="font-medium text-slate-700">
            MindBridge Student Mental Well-being Platform
          </p>
          <p>
            This service provides supportive active listening, stress management coping tools, and clinical self-screenings. It is not a substitute for professional clinical medical advice, psychiatric diagnosis, or emergency healthcare.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Link href="/about" className="underline hover:text-slate-800 focus-accessible">
              About & Privacy Architecture
            </Link>
            <span>&bull;</span>
            <Link href="/support-now" className="underline text-amber-700 hover:text-amber-900 focus-accessible font-medium">
              Emergency & Crisis Contacts
            </Link>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};
