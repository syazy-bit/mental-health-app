import React from 'react';

export const BotanicalVaseIllustration: React.FC<{ className?: string }> = ({
  className = 'w-28 sm:w-36 h-auto',
}) => {
  return (
    <svg
      viewBox="0 0 160 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background Soft Sun Halo */}
      <circle cx="105" cy="70" r="35" fill="#F4EFE6" fillOpacity="0.8" stroke="#E5DDD0" strokeWidth="1" />
      <circle cx="130" cy="45" r="3" fill="#A3C9A8" opacity="0.6" />

      {/* Botanical Branches Extending from Vase */}
      <g stroke="#315243" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Main Center Stem */}
        <path d="M 80 130 V 30" />
        <path d="M 80 40 C 65 30 60 50 80 55" fill="#7EA68E" fillOpacity="0.7" />
        <path d="M 80 60 C 95 50 100 70 80 75" fill="#A3C9A8" fillOpacity="0.7" />
        <path d="M 80 80 C 65 70 60 90 80 95" fill="#507565" fillOpacity="0.7" />
        <path d="M 80 100 C 95 90 100 110 80 115" fill="#7EA68E" fillOpacity="0.7" />
        {/* Top Bud */}
        <ellipse cx="80" cy="25" rx="5" ry="8" fill="#315243" />

        {/* Side Delicate Twig */}
        <path d="M 80 85 Q 105 75 115 60" />
        <path d="M 115 60 C 120 52 110 50 115 60" fill="#A3C9A8" />
      </g>

      {/* Elegant Ceramic Vase */}
      <g stroke="#64736C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Vase neck and base */}
        <path
          d="M 72 125 L 88 125 L 88 135 C 102 145 106 175 92 185 L 68 185 C 54 175 58 145 72 135 Z"
          fill="#FFFFFF"
        />
        {/* Vase rim */}
        <ellipse cx="80" cy="125" rx="8" ry="2" fill="#E8ECE9" stroke="#64736C" strokeWidth="1.2" />
        {/* Subtle shine highlight */}
        <path d="M 66 150 Q 64 165 72 176" stroke="#D5E0DC" strokeWidth="1.5" fill="none" />
      </g>

      {/* Wooden Stool / Pedestal */}
      <g stroke="#8C7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Stool Top */}
        <rect x="45" y="185" width="70" height="6" rx="2" fill="#DEC7AE" />
        {/* Legs */}
        <line x1="52" y1="191" x2="48" y2="215" strokeWidth="2" />
        <line x1="108" y1="191" x2="112" y2="215" strokeWidth="2" />
        <line x1="80" y1="191" x2="80" y2="212" strokeWidth="1.5" />
        {/* Crossbar */}
        <line x1="50" y1="204" x2="110" y2="204" strokeWidth="1.2" />
      </g>
    </svg>
  );
};
