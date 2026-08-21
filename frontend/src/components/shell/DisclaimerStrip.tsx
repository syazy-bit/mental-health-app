import React from 'react';
import Link from 'next/link';

export const DisclaimerStrip: React.FC = () => {
  return (
    <aside
      aria-label="Emergency and confidential support notice"
      className="bg-[#FFFBEB] border-b border-[#FDE68A] text-[#78350F] py-2 px-4 text-xs sm:text-sm font-medium"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D97706] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D97706]" />
          </span>
          <p className="leading-tight">
            <strong className="font-bold text-[#92400E]">100% Anonymous & Confidential.</strong>{' '}
            <span className="text-amber-900/90">
              If you are in immediate distress or crisis, free support is available 24/7.
            </span>
          </p>
        </div>
        <Link
          href="/support-now"
          className="inline-flex items-center gap-1 text-[#B45309] hover:text-[#78350F] font-bold underline underline-offset-2 py-0.5 focus-accessible rounded-md shrink-0 transition-colors"
        >
          <span>Get Help Now (24/7 Helplines)</span>
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </aside>
  );
};
