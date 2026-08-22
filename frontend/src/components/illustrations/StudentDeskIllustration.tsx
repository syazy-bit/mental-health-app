import React from 'react';

export const StudentDeskIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-auto max-w-sm lg:max-w-md',
}) => {
  return (
    <svg
      viewBox="0 0 460 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Soft atmospheric gradient */}
        <linearGradient id="windowBackdrop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2EFE9" />
          <stop offset="100%" stopColor="#F5FAF7" />
        </linearGradient>
        <linearGradient id="heroOrganicBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EBF4EE" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F7F3EB" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* 1. Organic Calming Background Blob */}
      <path
        d="M 90 40 C 220 10, 390 20, 430 110 C 470 200, 440 310, 380 340 C 310 375, 180 370, 100 340 C 30 310, 15 220, 30 140 C 45 60, 60 45, 90 40 Z"
        fill="url(#heroOrganicBg)"
      />

      {/* 2. Clean Arched Window with Serene Outdoors */}
      <g transform="translate(230, 40)">
        {/* Window Arch Frame */}
        <path
          d="M 0 60 C 0 20, 30 0, 80 0 C 130 0, 160 20, 160 60 L 160 190 L 0 190 Z"
          fill="url(#windowBackdrop)"
          stroke="#9CB3A8"
          strokeWidth="2"
        />
        {/* Window Sill */}
        <rect x="-8" y="190" width="176" height="6" rx="2" fill="#D6CFC4" stroke="#9CB3A8" strokeWidth="1.5" />

        {/* Minimal Nature Tree Curves */}
        <path d="M 0 190 C 20 140, 60 115, 90 140 C 120 120, 145 135, 160 190 Z" fill="#9FC3A8" />
        <path d="M 30 190 C 50 150, 90 140, 115 160 C 135 145, 150 155, 160 190 Z" fill="#5E8B75" />
        <path d="M 70 190 C 85 165, 110 155, 135 170 C 145 160, 155 168, 160 190 Z" fill="#3B6352" />

        {/* Minimal Sun / Cloud accent */}
        <circle cx="120" cy="50" r="14" fill="#FFFFFF" fillOpacity="0.7" />

        {/* Subtle Window Cross Division */}
        <line x1="80" y1="0" x2="80" y2="190" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
        <line x1="0" y1="95" x2="160" y2="95" stroke="#FFFFFF" strokeWidth="2" opacity="0.6" />
      </g>

      {/* 3. Minimalist Wood Desk & Study Setup */}
      <g transform="translate(180, 230)">
        {/* Table Top */}
        <rect x="0" y="0" width="200" height="8" rx="2" fill="#DFCEB8" stroke="#8E7860" strokeWidth="1.5" />
        {/* Desk Legs */}
        <line x1="20" y1="8" x2="20" y2="110" stroke="#8E7860" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="180" y1="8" x2="180" y2="110" stroke="#8E7860" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="50" x2="180" y2="50" stroke="#B8A48E" strokeWidth="1.5" strokeLinecap="round" />

        {/* Ceramic Mug */}
        <rect x="135" y="-16" width="12" height="15" rx="2" fill="#507565" stroke="#315243" strokeWidth="1.2" />
        <path d="M147 -12 C150 -12 150 -7 147 -7" stroke="#315243" strokeWidth="1.2" fill="none" />

        {/* Journal Notebook & Pen */}
        <rect x="55" y="-6" width="42" height="6" rx="1" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
        <line x1="60" y1="-3" x2="75" y2="-3" stroke="#CBD5E1" strokeWidth="1" />
        <line x1="90" y1="-7" x2="100" y2="-11" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* 4. Student Writing in Journal (Clean Minimalist Silhouette) */}
      <g transform="translate(120, 160)">
        {/* Minimal Modern Chair */}
        <path
          d="M 50 60 C 45 95 48 140 60 140 L 105 140"
          stroke="#688F7B"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="58" y1="140" x2="52" y2="180" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="100" y1="140" x2="108" y2="180" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />

        {/* Student Torso & Sweater */}
        <path
          d="M 65 50 C 65 35 90 32 105 38 C 118 42 120 70 118 105 C 118 125 108 140 80 140 C 70 140 65 130 65 105 Z"
          fill="#3B6352"
          stroke="#203E33"
          strokeWidth="1.5"
        />

        {/* Student Arm reaching to desk */}
        <path
          d="M 108 52 C 122 65 130 80 142 85"
          stroke="#3B6352"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="144" cy="85" r="4" fill="#E8C3B0" />

        {/* Head & Peaceful Profile */}
        <circle cx="98" cy="16" r="11" fill="#E8C3B0" />
        {/* Hair */}
        <path
          d="M 88 16 C 88 7 94 3 104 3 C 112 3 114 8 112 14 C 110 12 104 9 98 10 C 92 11 89 13 88 16 Z"
          fill="#1C2826"
        />
      </g>

      {/* 5. Minimalist Foliage Plant */}
      <g transform="translate(360, 245)">
        <path d="M 12 80 L 38 80 L 34 110 L 16 110 Z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
        {/* Simple modern leaves */}
        <path d="M 25 80 C 10 55 -5 45 5 25 C 20 40 25 65 25 80" fill="#7EA68E" stroke="#315243" strokeWidth="1.2" />
        <path d="M 25 80 C 35 50 55 40 45 20 C 30 35 25 65 25 80" fill="#456E5A" stroke="#223E32" strokeWidth="1.2" />
        <path d="M 25 80 C 25 45 28 20 38 5 C 42 25 35 60 25 80" fill="#A3C9A8" stroke="#315243" strokeWidth="1.2" />
      </g>
    </svg>
  );
};
