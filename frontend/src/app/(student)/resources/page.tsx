'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

type NeedCategory = 'calm' | 'ground' | 'focus' | 'explore' | 'talk';

export default function ResourcesPage() {
  const [activeNeed, setActiveNeed] = useState<NeedCategory>('calm');

  // --- TOOL 1: 4-4-4-4 BOX BREATHING ---
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Pause'>('Inhale');
  const [breathingTimer, setBreathingTimer] = useState(4);
  const [breathingCycleCount, setBreathingCycleCount] = useState(0);

  const toggleBreathing = () => {
    if (!breathingActive) {
      setBreathingPhase('Inhale');
      setBreathingTimer(4);
      setBreathingCycleCount(0);
      setBreathingActive(true);
    } else {
      setBreathingActive(false);
      setBreathingPhase('Inhale');
      setBreathingTimer(4);
    }
  };

  useEffect(() => {
    if (!breathingActive) return;

    const interval = setInterval(() => {
      setBreathingTimer((prev) => {
        if (prev > 1) return prev - 1;

        setBreathingPhase((currentPhase) => {
          switch (currentPhase) {
            case 'Inhale':
              return 'Hold';
            case 'Hold':
              return 'Exhale';
            case 'Exhale':
              return 'Pause';
            case 'Pause':
              setBreathingCycleCount((c) => c + 1);
              return 'Inhale';
          }
        });
        return 4;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [breathingActive]);

  // --- TOOL 2: 5-4-3-2-1 GROUNDING EXERCISE ---
  const [groundingStep, setGroundingStep] = useState(0);
  const groundingSteps = [
    {
      count: 5,
      sense: 'Sight',
      title: 'Find 5 things you can see',
      prompt: 'Look around your room or desk. Notice colors, patterns, textures, or shadows that you normally overlook.',
      hints: ['A shadow on the wall', 'A specific pencil or pen', 'Pattern on fabric', 'Reflections in glass', 'A light switch'],
    },
    {
      count: 4,
      sense: 'Touch',
      title: 'Notice 4 things you can physically feel',
      prompt: 'Bring attention to physical contact. Notice how textures, clothing, or gravity feel against your body.',
      hints: ['Your feet resting on the floor', 'The texture of your desk or chair', 'The weight of your shirt', 'A cool breeze or warmth'],
    },
    {
      count: 3,
      sense: 'Hearing',
      title: 'Identify 3 things you can hear',
      prompt: 'Listen past the obvious sounds. Focus on subtle background room tone or outside ambient noises.',
      hints: ['Hum of a fan or computer', 'Distant traffic or footsteps', 'The sound of your own steady breathing'],
    },
    {
      count: 2,
      sense: 'Smell',
      title: 'Notice 2 things you can smell',
      prompt: 'Inhale gently. Notice any nearby scent in the air, or simply notice the clean neutrality of the air.',
      hints: ['Fresh notebook paper', 'A cup of tea or coffee', 'Fresh air from an open window'],
    },
    {
      count: 1,
      sense: 'Taste & Affirmation',
      title: 'Notice 1 taste or repeat a quiet affirmation',
      prompt: 'Take a sip of water, or gently remind yourself: "I am safe in this present moment, and I can take this one step at a time."',
      hints: ['A sip of cool water', 'A gentle mental reminder: I am here right now.'],
    },
  ];

  // --- TOOL 3: STUDY RESET CHECKLIST ---
  const [studyChecks, setStudyChecks] = useState<boolean[]>([false, false, false, false]);
  const studyItems = [
    { title: 'Unclench your jaw and drop your shoulders', desc: 'Release tension in your neck, forehead, and upper back.' },
    { title: 'Look 20 feet away for 20 seconds', desc: 'Rest your optic nerve and blink to refresh dry screen eyes.' },
    { title: 'Take three slow, full sips of water', desc: 'Hydration directly improves cognitive focus and alertness.' },
    { title: 'Write down your next single task on paper', desc: 'Focus on one small action item rather than the entire assignment.' },
  ];

  const toggleStudyCheck = (index: number) => {
    const updated = [...studyChecks];
    updated[index] = !updated[index];
    setStudyChecks(updated);
  };

  const resetStudyChecks = () => setStudyChecks([false, false, false, false]);

  // --- TOOL 4: GROUNDING HUNT (EXPLORE SURROUNDINGS) ---
  const [huntStep, setHuntStep] = useState(0);
  const huntSteps = [
    {
      title: 'Find something blue.',
      supporting: 'Look around your space and find something blue.',
    },
    {
      title: 'Find something with an interesting texture.',
      supporting: 'Notice how it looks or feels.',
    },
    {
      title: 'Find something familiar.',
      supporting: 'Choose something you see or use often.',
    },
    {
      title: 'Find something you like looking at.',
      supporting: 'Take a second to observe what draws your attention.',
    },
    {
      title: 'Look around and notice one thing you hadn\'t noticed before.',
      supporting: 'Look closely at your surroundings.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-2 sm:py-6 w-full">
      {/* 1. EDITORIAL HEADER */}
      <div className="space-y-3 max-w-2xl">
        <div className="inline-flex items-center">
          <Badge variant="brand" size="md" dot>
            Interactive Grounding & Coping Tools
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#19232D] tracking-tight">
          Take a moment to pause and reset
        </h1>
        <p className="text-slate-600 text-xs sm:text-sm sm:leading-relaxed">
          Self-guided tools you can use right now to slow down racing thoughts, release study tension, or explore your surroundings.
        </p>
      </div>

      {/* 2. NEED-ORIENTED ENTRY SELECTOR */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          What do you need right now?
        </p>
        <div
          role="tablist"
          aria-label="Student needs selector"
          className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold select-none"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeNeed === 'calm'}
            onClick={() => setActiveNeed('calm')}
            className={`px-3.5 py-2 rounded-full transition-all cursor-pointer focus-accessible whitespace-nowrap touch-target ${
              activeNeed === 'calm'
                ? 'bg-[#0D5C56] text-white shadow-2xs'
                : 'bg-white border border-[#E6E4DD] text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Calm my mind
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeNeed === 'ground'}
            onClick={() => setActiveNeed('ground')}
            className={`px-3.5 py-2 rounded-full transition-all cursor-pointer focus-accessible whitespace-nowrap touch-target ${
              activeNeed === 'ground'
                ? 'bg-[#0D5C56] text-white shadow-2xs'
                : 'bg-white border border-[#E6E4DD] text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Ground myself
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeNeed === 'focus'}
            onClick={() => setActiveNeed('focus')}
            className={`px-3.5 py-2 rounded-full transition-all cursor-pointer focus-accessible whitespace-nowrap touch-target ${
              activeNeed === 'focus'
                ? 'bg-[#0D5C56] text-white shadow-2xs'
                : 'bg-white border border-[#E6E4DD] text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Focus & study reset
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeNeed === 'explore'}
            onClick={() => setActiveNeed('explore')}
            className={`px-3.5 py-2 rounded-full transition-all cursor-pointer focus-accessible whitespace-nowrap touch-target ${
              activeNeed === 'explore'
                ? 'bg-[#0D5C56] text-white shadow-2xs'
                : 'bg-white border border-[#E6E4DD] text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Explore my surroundings
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeNeed === 'talk'}
            onClick={() => setActiveNeed('talk')}
            className={`px-3.5 py-2 rounded-full transition-all cursor-pointer focus-accessible whitespace-nowrap touch-target ${
              activeNeed === 'talk'
                ? 'bg-[#D97706] text-white shadow-2xs'
                : 'bg-white border border-[#E6E4DD] text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            Talk to someone
          </button>
        </div>
      </div>

      {/* 3. INTERACTIVE EXPERIENCES CONTAINER */}
      <div className="space-y-6">
        {/* TOOL 1: BOX BREATHING EXERCISE (Active on 'calm') */}
        {activeNeed === 'calm' && (
          <Card
            variant="elevated"
            padding="lg"
            className="bg-white border border-[#0D5C56]/20 shadow-[0_4px_20px_rgba(25,35,45,0.05)] rounded-2xl space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6E4DD] pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56]">
                  Guided Pacing &bull; 4-4-4-4 Method
                </span>
                <h2 className="text-xl font-bold text-[#19232D]">
                  Box Breathing Exercise
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-lg leading-relaxed">
                  A simple rhythmic breathing exercise. Follow the visual cue to inhale, hold, exhale, and pause for 4 seconds each.
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-medium text-slate-500 block">Completed Cycles</span>
                <span className="text-xl font-bold text-[#0D5C56] font-mono">{breathingCycleCount}</span>
              </div>
            </div>

            {/* Interactive Breathing Canvas */}
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              <div
                className={`relative w-40 h-40 rounded-3xl flex flex-col items-center justify-center text-center select-none transition-all duration-700 ease-out border ${
                  breathingActive
                    ? breathingPhase === 'Inhale'
                      ? 'scale-110 bg-[#F0FDFA] border-[#0D5C56] shadow-md'
                      : breathingPhase === 'Hold'
                      ? 'scale-110 bg-[#FAF9F6] border-[#0D5C56]/60 shadow-md'
                      : breathingPhase === 'Exhale'
                      ? 'scale-90 bg-stone-50 border-slate-300'
                      : 'scale-90 bg-[#FAF9F6] border-slate-200'
                    : 'bg-[#FAF9F6] border-[#E6E4DD]'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56]">
                  {breathingActive ? breathingPhase : 'Ready'}
                </span>
                <span className="text-3xl font-extrabold text-[#0D5C56] font-mono mt-1">
                  {breathingActive ? `${breathingTimer}s` : '4s'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">
                  {breathingActive
                    ? breathingPhase === 'Inhale'
                      ? 'Breathe in slowly'
                      : breathingPhase === 'Hold'
                      ? 'Hold gently'
                      : breathingPhase === 'Exhale'
                      ? 'Release smoothly'
                      : 'Rest empty'
                    : 'Press Start'}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={breathingActive ? 'secondary' : 'brand'}
                  size="md"
                  onClick={toggleBreathing}
                >
                  {breathingActive ? 'Pause Exercise' : 'Start 1-Minute Reset'}
                </Button>
                {breathingCycleCount > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setBreathingActive(false);
                      setBreathingCycleCount(0);
                      setBreathingPhase('Inhale');
                      setBreathingTimer(4);
                    }}
                  >
                    Reset Counter
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* TOOL 2: 5-4-3-2-1 SENSORY GROUNDING (Active on 'ground') */}
        {activeNeed === 'ground' && (
          <Card
            variant="elevated"
            padding="lg"
            className="bg-white border border-[#E6E4DD] shadow-2xs rounded-2xl space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E4DD] pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56]">
                  Interactive Grounding &bull; 5-Step Scan
                </span>
                <h2 className="text-xl font-bold text-[#19232D]">
                  5-4-3-2-1 Sensory Grounding
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                  Anchor your attention in the physical present. Step through each of the five senses at your own pace.
                </p>
              </div>
              <Badge variant="sage" size="md">
                Step {groundingStep + 1} of {groundingSteps.length}
              </Badge>
            </div>

            {/* Current Step Canvas */}
            <div className="p-5 sm:p-6 bg-[#FAF9F6] rounded-2xl border border-[#E6E4DD] space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-[#0D5C56] text-white font-bold flex items-center justify-center text-sm font-mono shrink-0">
                  {groundingSteps[groundingStep].count}
                </span>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {groundingSteps[groundingStep].sense}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-[#19232D]">
                    {groundingSteps[groundingStep].title}
                  </h3>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-12">
                {groundingSteps[groundingStep].prompt}
              </p>

              <div className="pl-12 pt-2 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Examples you might notice:
                </p>
                <div className="flex flex-wrap gap-2">
                  {groundingSteps[groundingStep].hints.map((hint) => (
                    <span
                      key={hint}
                      className="px-2.5 py-1 bg-white rounded-lg border border-[#E6E4DD] text-xs text-slate-600"
                    >
                      {hint}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setGroundingStep((prev) => Math.max(0, prev - 1))}
                disabled={groundingStep === 0}
                className={groundingStep === 0 ? 'invisible' : ''}
              >
                &larr; Previous Sense
              </Button>

              {groundingStep < groundingSteps.length - 1 ? (
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={() => setGroundingStep((prev) => prev + 1)}
                >
                  <span>Next Step ({groundingSteps[groundingStep + 1].count} {groundingSteps[groundingStep + 1].sense})</span>
                  <span aria-hidden="true">&rarr;</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setGroundingStep(0)}
                >
                  Complete & Restart
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* TOOL 3: STUDY RESET / DELIBERATE REST (Active on 'focus') */}
        {activeNeed === 'focus' && (
          <Card
            variant="elevated"
            padding="lg"
            className="bg-white border border-[#E6E4DD] shadow-2xs rounded-2xl space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E4DD] pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56]">
                  Academic Pacing &bull; 2-Minute Reset
                </span>
                <h2 className="text-xl font-bold text-[#19232D]">
                  Study Pause & Deliberate Rest
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                  Before diving back into studying, check off each step to release physical tension and reset your cognitive focus.
                </p>
              </div>
              <Badge variant="sage" size="md">
                {studyChecks.filter(Boolean).length} of {studyItems.length} Complete
              </Badge>
            </div>

            {/* Interactive Checklist */}
            <div className="space-y-3">
              {studyItems.map((item, idx) => {
                const isChecked = studyChecks[idx];
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => toggleStudyCheck(idx)}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer focus-accessible select-none ${
                      isChecked
                        ? 'bg-[#F0FDFA] border-[#0D5C56]/30 text-[#0D5C56]'
                        : 'bg-white border-[#E6E4DD] hover:bg-[#FAF9F6] text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs shrink-0 mt-0.5 transition-colors ${
                        isChecked
                          ? 'border-[#0D5C56] bg-[#0D5C56] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isChecked && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <div className="space-y-0.5">
                      <p className={`text-xs sm:text-sm font-bold ${isChecked ? 'line-through text-slate-500' : 'text-[#19232D]'}`}>
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {studyChecks.every(Boolean) ? 'All steps complete. Ready for focused work!' : 'Tap each step to check it off.'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetStudyChecks}
              >
                Reset Checklist
              </Button>
            </div>
          </Card>
        )}

        {/* TOOL 4: GROUNDING HUNT (Active on 'explore') */}
        {activeNeed === 'explore' && (
          <Card
            variant="elevated"
            padding="lg"
            className="bg-white border border-[#E6E4DD] shadow-2xs rounded-2xl space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E4DD] pb-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D5C56]">
                  Sensory Attention &bull; 60–90 Seconds
                </span>
                <h2 className="text-xl font-bold text-[#19232D]">
                  Grounding Hunt
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                  A short sensory attention activity to reconnect with your immediate physical surroundings.
                </p>
              </div>
              <Badge variant="sage" size="md">
                {huntStep < huntSteps.length ? `Step ${huntStep + 1} of ${huntSteps.length}` : 'Completed'}
              </Badge>
            </div>

            {/* Step Content / Completion */}
            {huntStep < huntSteps.length ? (
              <div className="p-6 sm:p-8 bg-[#FAF9F6] rounded-2xl border border-[#E6E4DD] space-y-6 text-center sm:text-left">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Prompt {huntStep + 1} of {huntSteps.length}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[#19232D] leading-snug">
                    {huntSteps[huntStep].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pt-1">
                    {huntSteps[huntStep].supporting}
                  </p>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setHuntStep((prev) => Math.max(0, prev - 1))}
                    disabled={huntStep === 0}
                    className={huntStep === 0 ? 'invisible' : ''}
                  >
                    &larr; Previous
                  </Button>

                  <Button
                    type="button"
                    variant="brand"
                    size="md"
                    onClick={() => setHuntStep((prev) => prev + 1)}
                    className="w-full sm:w-auto"
                  >
                    <span>I found it</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-[#F0FDFA] rounded-2xl border border-[#CCFBF1] text-center space-y-4">
                <div className="space-y-1.5 max-w-md mx-auto">
                  <h3 className="text-xl font-bold text-[#0D5C56]">
                    You made it through.
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Take a moment before moving on.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="brand"
                    size="md"
                    onClick={() => setHuntStep(0)}
                  >
                    Do it again
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* 4. LOWER SUPPORT PATHWAYS (Distinct, Accessible, Clean) */}
      <div className="space-y-8 pt-4 border-t border-[#E6E4DD]">
        {/* 24/7 HELPLINES DIRECTORY */}
        <section aria-labelledby="helplines-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6E4DD] pb-2">
            <div>
              <h2 id="helplines-heading" className="text-lg font-bold text-[#19232D]">
                Immediate 24/7 Helplines
              </h2>
              <p className="text-xs text-slate-500">
                Toll-free, confidential national support lines available anytime across India.
              </p>
            </div>
            <Link
              href="/support-now"
              className="text-xs font-bold text-[#D97706] hover:text-[#B45309] underline focus-accessible shrink-0"
            >
              Full Emergency Screen &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tele-MANAS */}
            <Card
              variant="default"
              padding="md"
              className="space-y-3 bg-white border border-[#E6E4DD] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#19232D]">
                      Tele-MANAS
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Government of India National Tele-Mental Health Programme
                    </p>
                  </div>
                  <Badge variant="amber" size="sm">
                    24/7 Toll-free
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Free, confidential 24/7 tele-counseling available in English, Hindi, and regional Indian languages.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-[#19232D]">
                  14416
                </span>
                <a
                  href="tel:14416"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0D5C56] hover:text-[#115E59] focus-accessible p-1 rounded-md"
                >
                  <span>Call Now</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </Card>

            {/* KIRAN */}
            <Card
              variant="default"
              padding="md"
              className="space-y-3 bg-white border border-[#E6E4DD] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#19232D]">
                      KIRAN Helpline
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Ministry of Social Justice & Empowerment
                    </p>
                  </div>
                  <Badge variant="neutral" size="sm">
                    24/7 Toll-free
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  24/7 national psychological support helpline for anxiety, distress, panic, and emotional crisis.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-[#19232D]">
                  1800-599-0019
                </span>
                <a
                  href="tel:18005990019"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0D5C56] hover:text-[#115E59] focus-accessible p-1 rounded-md"
                >
                  <span>Call Now</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </Card>

            {/* AASRA */}
            <Card
              variant="default"
              padding="md"
              className="space-y-3 bg-white border border-[#E6E4DD] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#19232D]">
                      AASRA Suicide Prevention
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      AASRA Crisis Intervention Centre
                    </p>
                  </div>
                  <Badge variant="neutral" size="sm">
                    24/7 Helpline
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  24/7 non-judgmental, confidential emotional listening and suicide prevention intervention.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-[#19232D]">
                  +91-98204-66726
                </span>
                <a
                  href="tel:+919820466726"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0D5C56] hover:text-[#115E59] focus-accessible p-1 rounded-md"
                >
                  <span>Call Now</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </Card>

            {/* Vandrevala */}
            <Card
              variant="default"
              padding="md"
              className="space-y-3 bg-white border border-[#E6E4DD] shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-[#19232D]">
                      Vandrevala Foundation
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Mental Health Support Initiative
                    </p>
                  </div>
                  <Badge variant="neutral" size="sm">
                    24/7 Professional
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  Free professional psychological counseling by trained mental health professionals.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="font-mono font-bold text-sm text-[#19232D]">
                  1860-2662-345
                </span>
                <a
                  href="tel:18602662345"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0D5C56] hover:text-[#115E59] focus-accessible p-1 rounded-md"
                >
                  <span>Call Now</span>
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </Card>
          </div>
        </section>

        {/* CAMPUS COUNSELING PATHWAY */}
        <Card
          variant="interactive"
          padding="lg"
          className="bg-white border-t-3 border-t-[#0D5C56] space-y-4"
        >
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[#19232D]">
              Campus Counseling & 1-on-1 Support
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
              Campus counseling provides dedicated, private one-on-one guidance to help you navigate academic stress, burnout, and personal challenges during your studies.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700 pt-1">
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD]">
              <span className="font-bold text-[#0D5C56] block mb-0.5">Private Guidance</span>
              A dedicated space to speak with campus professionals.
            </div>
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD]">
              <span className="font-bold text-[#0D5C56] block mb-0.5">Collaborative Goals</span>
              Work together on actionable coping strategies.
            </div>
            <div className="p-3 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD]">
              <span className="font-bold text-[#0D5C56] block mb-0.5">Student-Centered</span>
              No concern is too small or insignificant to bring.
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link href="/booking">
              <Button variant="brand" size="md">
                <span>Meet Counseling Team & View Open Times</span>
                <span aria-hidden="true">&rarr;</span>
              </Button>
            </Link>
            <Link
              href="/booking/status"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors p-2"
            >
              Already booked? Check Appointment Status &rarr;
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
