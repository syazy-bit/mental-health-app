import React from 'react';

export const MeditationIllustration: React.FC<{ className?: string }> = ({
  className = 'w-full h-auto max-w-md',
}) => {
  return (
    <svg
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background soft ambient halo */}
      <circle
        cx="250"
        cy="240"
        r="160"
        className="fill-[#DCEAE0] dark:fill-[#20362C]"
        fillOpacity="0.9"
      />

      {/* Botanical foliage - Left side */}
      <g
        className="stroke-[#3D5F50] dark:stroke-[#8FB89C]"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Branch stem left */}
        <path d="M190 320 Q130 260 160 180" />
        <path
          d="M160 180 Q130 160 115 175 Q135 200 160 180"
          className="fill-[#8EBE9B] dark:fill-[#4E7A5E]"
          fillOpacity="0.55"
        />
        <path
          d="M145 220 Q110 215 110 235 Q135 245 145 220"
          className="fill-[#8EBE9B] dark:fill-[#4E7A5E]"
          fillOpacity="0.55"
        />
        <path
          d="M152 260 Q120 270 128 290 Q150 285 152 260"
          className="fill-[#8EBE9B] dark:fill-[#4E7A5E]"
          fillOpacity="0.55"
        />
        <path
          d="M175 295 Q145 315 155 330 Q175 320 175 295"
          className="fill-[#8EBE9B] dark:fill-[#4E7A5E]"
          fillOpacity="0.55"
        />
      </g>

      {/* Botanical foliage - Right side */}
      <g
        className="stroke-[#3D5F50] dark:stroke-[#8FB89C]"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Branch stem right */}
        <path d="M310 320 Q370 260 340 180" />
        <path
          d="M340 180 Q370 160 385 175 Q365 200 340 180"
          className="fill-[#8EBE9B] dark:fill-[#4E7A5E]"
          fillOpacity="0.55"
        />
        <path
          d="M355 220 Q390 215 390 235 Q365 245 355 220"
          className="fill-[#8EBE9B] dark:fill-[#4E7A5E]"
          fillOpacity="0.55"
        />
        <path
          d="M348 260 Q380 270 372 290 Q350 285 348 260"
          className="fill-[#8EBE9B] dark:fill-[#4E7A5E]"
          fillOpacity="0.55"
        />
        <path
          d="M325 295 Q355 315 345 330 Q325 320 325 295"
          className="fill-[#8EBE9B] dark:fill-[#4E7A5E]"
          fillOpacity="0.55"
        />
      </g>

      {/* Floating Sparkles & Dots */}
      <g
        className="stroke-[#4D695D] dark:stroke-[#A3C9A8] text-[#4D695D] dark:text-[#A3C9A8]"
        strokeWidth="1.5"
      >
        <path d="M360 140 L360 152 M354 146 L366 146" strokeLinecap="round" />
        <circle cx="130" cy="140" r="2.5" fill="currentColor" />
        <circle cx="370" cy="220" r="2" fill="currentColor" />
        <circle cx="120" cy="260" r="2" fill="currentColor" />
        <path d="M140 360 L140 370 M135 365 L145 365" strokeLinecap="round" />
      </g>

      {/* Meditation Figure (Clean Line Art) */}
      <g
        className="stroke-[#182C24] dark:stroke-[#EAF2ED]"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Hair Bun & Head */}
        <path d="M250 115 C240 115 235 125 235 135 C235 145 242 150 250 150 C258 150 265 145 265 135 C265 125 260 115 250 115 Z" />
        {/* Hair flow */}
        <path d="M232 150 C220 165 220 190 225 215 C230 190 235 165 245 158" />
        <path d="M268 150 C280 165 280 190 275 215 C270 190 265 165 255 158" />

        {/* Face & peaceful closed eyes */}
        <path d="M235 155 C235 180 242 195 250 195 C258 195 265 180 265 155" />
        <path d="M242 168 Q246 172 250 168" strokeWidth="1.6" />
        <path d="M250 168 Q254 172 258 168" strokeWidth="1.6" />
        <path d="M248 182 Q250 184 252 182" strokeWidth="1.3" />

        {/* Neck and collarbone */}
        <path d="M246 195 L246 210 Q240 215 230 220" />
        <path d="M254 195 L254 210 Q260 215 270 220" />
        <path d="M242 215 Q250 220 258 215" strokeWidth="1.6" />

        {/* Shoulders & Torso */}
        <path d="M230 220 C210 230 200 260 198 310" />
        <path d="M270 220 C290 230 300 260 302 310" />
        <path d="M232 230 C232 270 235 300 235 330" />
        <path d="M268 230 C268 270 265 300 265 330" />

        {/* Meditation arms & hands resting on lap */}
        <path d="M198 310 C195 335 215 365 240 365" />
        <path d="M302 310 C305 335 285 365 260 365" />
        <path d="M240 365 Q250 360 260 365" />
        <path d="M238 355 Q250 350 262 355" strokeWidth="1.6" />

        {/* Crossed Legs (Lotus Position) */}
        <path d="M170 380 C190 350 230 365 250 375 C270 365 310 350 330 380 C340 395 310 410 250 410 C190 410 160 395 170 380 Z" />
        <path d="M170 380 C185 390 215 395 240 392" strokeWidth="1.6" />
        <path d="M330 380 C315 390 285 395 260 392" strokeWidth="1.6" />
        <path d="M200 405 C225 410 275 410 300 405" strokeWidth="1.6" />
      </g>
    </svg>
  );
};
