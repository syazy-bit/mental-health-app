import React from 'react';
import Link from 'next/link';

export const DisclaimerStrip: React.FC = () => {
  return (
    <aside
      aria-label="Emergency and privacy notice"
      className="bg-[#FEF3C7] border-b border-[#FDE68A] text-amber-950 py-2 px-4 text-xs sm:text-sm font-medium"
    >
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full bg-[#D97706]"
            aria-hidden="true"
          />
          <span>
            <strong>100% Anonymous & Confidential.</strong> If you are in immediate danger or distress, support is available 24/7.
          </span>
        </div>
        <Link
          href="/support-now"
          className="inline-flex items-center text-[#B45309] hover:text-amber-950 font-semibold underline underline-offset-2 touch-target py-1 px-2 focus-accessible rounded-md"
        >
          Get Help Now (24/7 Helplines) &rarr;
        </Link>
      </div>
    </aside>
  );
};
