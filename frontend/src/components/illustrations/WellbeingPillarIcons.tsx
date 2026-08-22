import React from 'react';

export const LungsIcon: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {/* Trachea */}
    <path d="M32 8 V24" />
    <path d="M28 14 H36" />
    <path d="M28 19 H36" />
    {/* Bronchi branches */}
    <path d="M32 24 Q26 28 20 32" />
    <path d="M32 24 Q38 28 44 32" />
    {/* Left Lung with botanical leaf rib */}
    <path d="M20 32 C12 34 8 42 10 50 C12 56 22 58 26 52 C28 48 26 36 20 32 Z" />
    <path d="M18 38 C14 42 14 48 18 50" strokeWidth="1.25" />
    {/* Right Lung with botanical leaf rib */}
    <path d="M44 32 C52 34 56 42 54 50 C52 56 42 58 38 52 C36 48 38 36 44 32 Z" />
    <path d="M46 38 C50 42 50 48 46 50" strokeWidth="1.25" />
  </svg>
);

export const HeadMindIcon: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {/* Profile Outline */}
    <path d="M22 54 C24 50 25 44 25 40 C22 39 19 36 19 33 C19 30 21 28 24 28 C22 18 28 10 38 10 C48 10 54 18 54 28 C54 39 46 48 38 50 L38 54" />
    {/* Leaf / Sprout inside mind */}
    <path d="M36 34 C36 25 44 20 44 20 C44 20 45 28 40 33 Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M36 34 Q34 26 28 24 Q32 30 36 34" strokeWidth="1.25" />
    <circle cx="36" cy="34" r="1.5" fill="currentColor" />
  </svg>
);

export const MoonRestIcon: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {/* Crescent Moon */}
    <path d="M38 12 C24 14 14 26 16 40 C18 52 30 60 44 56 C34 52 30 40 34 28 C36 21 40 16 44 14 C42 12 40 12 38 12 Z" />
    {/* Twinkling stars */}
    <path d="M46 18 L46 26 M42 22 L50 22" strokeWidth="1.25" />
    <circle cx="48" cy="36" r="1.5" fill="currentColor" />
    <circle cx="24" cy="22" r="1.5" fill="currentColor" />
  </svg>
);

export const BowlNourishIcon: React.FC<{ className?: string }> = ({ className = 'w-12 h-12' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {/* Bowl base */}
    <path d="M12 32 C12 46 22 52 32 52 C42 52 52 46 52 32 Z" />
    <path d="M10 32 H54" />
    <path d="M26 52 H38" />
    {/* Sprout & Botanical leaf growing from bowl */}
    <path d="M32 32 V18" />
    <path d="M32 24 C38 18 46 20 46 20 C46 20 44 28 36 27" strokeWidth="1.25" fill="currentColor" fillOpacity="0.15" />
    <path d="M32 26 C26 20 18 22 18 22 C18 22 20 30 28 29" strokeWidth="1.25" fill="currentColor" fillOpacity="0.15" />
    <circle cx="32" cy="16" r="1.5" fill="currentColor" />
  </svg>
);

export const SproutBranchIcon: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M40 70 V25" />
    {/* Central top leaf */}
    <path d="M40 25 C40 10 50 8 50 8 C50 8 50 20 40 25 Z" fill="currentColor" fillOpacity="0.15" />
    {/* Left leaves */}
    <path d="M40 40 C30 30 18 34 18 34 C18 34 22 46 38 43" />
    <path d="M40 55 C28 45 16 50 16 50 C16 50 20 62 38 58" />
    {/* Right leaves */}
    <path d="M40 40 C50 30 62 34 62 34 C62 34 58 46 42 43" />
    <path d="M40 55 C52 45 64 50 64 50 C64 50 60 62 42 58" />
  </svg>
);
