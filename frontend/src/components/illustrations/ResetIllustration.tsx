import React from 'react';

export const ResetIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-auto max-w-[240px]',
}) => {
  return (
    <svg
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background Soft Pastel Halo */}
      <circle cx="160" cy="160" r="110" fill="#D7E8DB" fillOpacity="0.5" />
      <circle cx="160" cy="160" r="85" fill="#E8F2EC" fillOpacity="0.8" />

      {/* Botanical Eucalyptus Stems Left */}
      <g stroke="#507565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 90 260 Q 60 200 75 130" />
        <ellipse cx="65" cy="190" rx="14" ry="9" transform="rotate(-25 65 190)" fill="#A3C9A8" fillOpacity="0.5" />
        <ellipse cx="85" cy="155" rx="12" ry="8" transform="rotate(20 85 155)" fill="#7EA68E" fillOpacity="0.5" />
        <ellipse cx="70" cy="130" rx="10" ry="7" transform="rotate(-15 70 130)" fill="#A3C9A8" fillOpacity="0.6" />
      </g>

      {/* Botanical Leaves Right */}
      <g stroke="#507565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 230 260 Q 260 200 245 130" />
        <ellipse cx="255" cy="190" rx="14" ry="9" transform="rotate(25 255 190)" fill="#A3C9A8" fillOpacity="0.5" />
        <ellipse cx="235" cy="155" rx="12" ry="8" transform="rotate(-20 235 155)" fill="#7EA68E" fillOpacity="0.5" />
        <ellipse cx="250" cy="130" rx="10" ry="7" transform="rotate(15 250 130)" fill="#A3C9A8" fillOpacity="0.6" />
      </g>

      {/* Serene Person (Clean Line Art) */}
      <g stroke="#22302A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* Hair Bun & Head */}
        <circle cx="160" cy="72" r="14" fill="#22302A" />
        <path d="M 142 98 C 142 75 178 75 178 98 C 178 120 142 120 142 98 Z" fill="#E8C3B0" />
        <path d="M 142 94 C 142 80 178 80 178 94 C 170 85 150 85 142 94 Z" fill="#22302A" />

        {/* Peaceful closed eyes & gentle smile */}
        <path d="M 150 102 Q 153 105 156 102" strokeWidth="1.5" fill="none" />
        <path d="M 164 102 Q 167 105 170 102" strokeWidth="1.5" fill="none" />
        <path d="M 157 112 Q 160 114 163 112" strokeWidth="1.2" fill="none" />

        {/* Neck */}
        <path d="M 155 120 L 155 136 L 165 136 L 165 120" fill="#E8C3B0" />

        {/* Shoulders & Organic Shirt Outline */}
        <path
          d="M 125 152 C 140 142 180 142 195 152 L 205 240 L 115 240 Z"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />

        {/* Hand over chest / heart (Self-compassion grounding posture) */}
        {/* Right arm coming across */}
        <path d="M 195 156 C 190 180 175 195 160 195" />
        {/* Palm & fingers gently resting over heart */}
        <path
          d="M 160 188 C 152 180 142 185 145 196 C 147 205 160 206 168 196 Z"
          fill="#E8C3B0"
        />
        <path d="M 148 186 L 158 192" strokeWidth="1.2" />
        <path d="M 152 183 L 161 190" strokeWidth="1.2" />
      </g>
    </svg>
  );
};
