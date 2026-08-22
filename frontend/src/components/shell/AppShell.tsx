'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { DisclaimerStrip } from './DisclaimerStrip';
import { DesktopHeader } from './DesktopHeader';
import { SystemStatusStrip } from './SystemStatusStrip';
import { InstitutionalFooter } from './InstitutionalFooter';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] dark:bg-[#101714] text-[#182C24] dark:text-[#F3F7F5] selection:bg-[#D5EADB] selection:text-[#143D32] dark:selection:bg-[#1D3A30] dark:selection:text-[#7EA68E] transition-colors duration-200">
      {/* Skip to Content Link for Accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Top Disclaimer & 24/7 Crisis Ribbon */}
      <DisclaimerStrip />

      {/* Main Desktop Header */}
      <DesktopHeader />

      {/* System Status Operational Strip */}
      <SystemStatusStrip />

      {/* Main Content Area */}
      <main
        id="main-content"
        key={pathname}
        tabIndex={-1}
        className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 pb-28 md:pb-16 outline-none animate-page-enter"
      >
        {children}
      </main>

      {/* Institutional Multi-Column Footer */}
      <InstitutionalFooter />

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};
