'use client';

import React, { useState, useEffect } from 'react';

type BreathingPhase = 'Inhale' | 'Hold' | 'Exhale' | 'Rest';

export const BreathingWidget: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>('Inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);

  useEffect(() => {
    if (!isActive) {
      setPhase('Inhale');
      setSecondsLeft(4);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Transition phases: 4s Inhale -> 7s Hold -> 8s Exhale -> 2s Rest
        if (phase === 'Inhale') {
          setPhase('Hold');
          return 7;
        } else if (phase === 'Hold') {
          setPhase('Exhale');
          return 8;
        } else if (phase === 'Exhale') {
          setPhase('Rest');
          return 2;
        } else {
          setPhase('Inhale');
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, phase]);

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'Inhale':
        return 'Breathe in slowly through your nose...';
      case 'Hold':
        return 'Gently hold your breath...';
      case 'Exhale':
        return 'Slowly release through your mouth...';
      case 'Rest':
        return 'Relax and pause...';
    }
  };

  const getScaleClass = () => {
    if (!isActive) return 'scale-100';
    switch (phase) {
      case 'Inhale':
        return 'scale-125 duration-[4000ms]';
      case 'Hold':
        return 'scale-125 duration-[7000ms]';
      case 'Exhale':
        return 'scale-90 duration-[8000ms]';
      case 'Rest':
        return 'scale-100 duration-[2000ms]';
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#F0F9F8] via-white to-[#FDF5F2] dark:from-[#142825] dark:via-[#162220] dark:to-[#2A1D1A] border border-[#E8E5DC] dark:border-[#253633] p-6 sm:p-8 shadow-xs">
      {/* Decorative ambient background blur */}
      <div className="ambient-glow-teal -top-12 -left-12 w-48 h-48 opacity-60" />
      <div className="ambient-glow-amber -bottom-12 -right-12 w-48 h-48 opacity-60" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-3 text-center md:text-left max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E5A54]/10 dark:bg-[#57ADA3]/15 text-[#0E5A54] dark:text-[#57ADA3] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#0E5A54] dark:bg-[#57ADA3] animate-pulse" />
            Grounding Exercise
          </div>
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-[#1A242B] dark:text-[#F1F5F3]">
            Take a 60-Second Breath
          </h3>
          <p className="text-sm text-[#5D6E77] dark:text-[#9EAEA9] leading-relaxed">
            Follow the 4-7-8 rhythm to instantly lower heart rate, ease autonomic nervous arousal, and calm racing thoughts.
          </p>
          <div className="pt-1">
            <button
              onClick={() => setIsActive(!isActive)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#0E5A54] hover:bg-[#126D66] dark:bg-[#57ADA3] dark:hover:bg-[#69BFB5] text-white dark:text-[#0F1615] transition-all duration-200 shadow-xs hover:shadow-md active:scale-95 focus-accessible"
            >
              {isActive ? 'Pause Exercise' : 'Start Calming Breath'}
            </button>
          </div>
        </div>

        {/* Breathing Circle Visualizer */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Outer pulsating ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-[#0E5A54]/20 dark:border-[#57ADA3]/30 transition-transform ease-in-out ${getScaleClass()}`}
            />
            {/* Inner soothing orb */}
            <div
              className={`w-28 h-28 rounded-full bg-gradient-to-tr from-[#0E5A54]/30 to-[#CE674D]/20 dark:from-[#57ADA3]/40 dark:to-[#E58A73]/30 backdrop-blur-md flex flex-col items-center justify-center text-center p-2 transition-transform ease-in-out ${getScaleClass()}`}
            >
              <span className="text-xs uppercase tracking-widest font-bold text-[#0E5A54] dark:text-[#57ADA3]">
                {phase}
              </span>
              <span className="font-heading text-2xl font-extrabold text-[#1A242B] dark:text-[#F1F5F3]">
                {secondsLeft}s
              </span>
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-[#5D6E77] dark:text-[#9EAEA9] text-center min-h-[1.25rem]">
            {isActive ? getPhaseInstruction() : 'Click start when ready'}
          </p>
        </div>
      </div>
    </div>
  );
};
