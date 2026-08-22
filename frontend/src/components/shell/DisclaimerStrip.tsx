'use client';

import React from 'react';
import Link from 'next/link';

export const DisclaimerStrip: React.FC = () => {
  return (
    <aside
      aria-label="Emergency and confidential support notice"
      className="bg-[#FDF4EC] dark:bg-[#281810] border-b border-[#F7DFC9] dark:border-[#422718] text-[#8C3F1D] dark:text-[#F3A57D] py-2 px-4 text-xs font-medium transition-colors"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#C5592D] dark:text-[#F3A57D] shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <p className="leading-tight text-[11px] sm:text-xs">
            <strong className="font-semibold text-[#6E2E12] dark:text-[#F8BFA3]">100% Anonymous &amp; Confidential.</strong>{' '}
            <span className="text-[#964E2D] dark:text-[#D99A7A]">
              If you are in immediate distress or crisis, free support is available 24/7.
            </span>
          </p>
        </div>
        <Link
          href="/support-now"
          className="inline-flex items-center gap-1 text-[#8C3F1D] dark:text-[#F8BFA3] hover:text-[#5B250D] dark:hover:text-[#FFFFFF] font-semibold text-[11px] sm:text-xs underline underline-offset-2 py-0.5 focus-accessible rounded-md shrink-0 transition-colors"
        >
          <span>Get Help Now (24/7 Helplines)</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </aside>
  );
};
