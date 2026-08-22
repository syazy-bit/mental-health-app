'use client';

import React, { useState, useEffect } from 'react';

type BreathingPhase = 'Inhale' | 'Hold' | 'Exhale' | 'Rest';

export const BreathingWidget: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<BreathingPhase>('Inhale');
  const [secondsLeft, setSecondsLeft] = useState(4);

  useEffect(() => {
    if (!isActive) return;

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

  const handleToggle = () => {
    if (isActive) {
      setIsActive(false);
      setPhase('Inhale');
      setSecondsLeft(4);
    } else {
      setIsActive(true);
    }
  };

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
    <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#16241E]/95 border border-[#D5E5DB] dark:border-[#284236] p-5 sm:p-7 shadow-xs">
      {/* Decorative ambient background blur */}
      <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-[#A3C9A8]/25 dark:bg-[#2E5244]/40 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-[#E58A73]/15 dark:bg-[#563932]/30 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2.5 text-center sm:text-left max-w-md">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#143D32]/10 dark:bg-[#A3C9A8]/15 text-[#143D32] dark:text-[#A3C9A8] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#143D32] dark:bg-[#A3C9A8] animate-pulse" />
            Grounding Exercise &bull; 4-7-8 Technique
          </div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#182C24] dark:text-[#F3F7F5]">
            Take a 60-Second Breath
          </h3>
          <p className="text-xs sm:text-sm text-[#5C7067] dark:text-[#A3B8AF] leading-relaxed">
            Follow the guided 4-7-8 rhythm to lower your heart rate, ground your nervous system, and ease anxiety.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={handleToggle}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-[#143D32] hover:bg-[#1C4E40] active:bg-[#0E2E25] dark:bg-[#A3C9A8] dark:hover:bg-[#8FBE95] text-white dark:text-[#12221A] transition-all duration-200 shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer focus-accessible"
            >
              <span>{isActive ? 'Pause Exercise' : 'Start Calming Breath'}</span>
              <span aria-hidden="true">{isActive ? '⏸' : '▶'}</span>
            </button>
          </div>
        </div>

        {/* Breathing Circle Visualizer */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Outer pulsating ring */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-[#143D32]/20 dark:border-[#A3C9A8]/30 transition-transform ease-in-out ${getScaleClass()}`}
            />
            {/* Inner soothing orb */}
            <div
              className={`w-28 h-28 rounded-full bg-gradient-to-tr from-[#143D32]/25 to-[#C76D54]/20 dark:from-[#A3C9A8]/30 dark:to-[#E58A73]/25 backdrop-blur-md flex flex-col items-center justify-center text-center p-2 transition-transform ease-in-out ${getScaleClass()}`}
            >
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#143D32] dark:text-[#A3C9A8]">
                {phase}
              </span>
              <span className="font-serif text-2xl font-bold text-[#182C24] dark:text-[#F3F7F5]">
                {secondsLeft}s
              </span>
            </div>
          </div>
          <p className="mt-2 text-xs font-medium text-[#5C7067] dark:text-[#A3B8AF] text-center min-h-[1.25rem]">
            {isActive ? getPhaseInstruction() : 'Click start when ready'}
          </p>
        </div>
      </div>
    </div>
  );
};
